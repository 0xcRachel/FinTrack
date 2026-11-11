package com.fintrack.service;

import com.fintrack.dto.WorkspaceDto;
import com.fintrack.dto.WorkspaceMemberDto;
import com.fintrack.entity.Users;
import com.fintrack.entity.Workspace;
import com.fintrack.entity.WorkspaceMember;
import com.fintrack.enums.WorkspaceRole;
import com.fintrack.enums.WorkspaceType;
import com.fintrack.repository.UsersRepository;
import com.fintrack.repository.WorkspaceMemberRepository;
import com.fintrack.repository.WorkspaceRepository;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Workspaces are the financial scopes a person can switch between. Each workspace has its
 * own data-owner user row; personal spaces reuse the person, family spaces use a locked
 * service account so existing user-scoped queries stay isolated without cross-space leaks.
 */
@Service
public class WorkspaceService {

  private final UsersRepository usersRepository;
  private final WorkspaceRepository workspaces;
  private final WorkspaceMemberRepository members;
  private final PasswordEncoder passwordEncoder;

  public WorkspaceService(UsersRepository usersRepository, WorkspaceRepository workspaces,
                          WorkspaceMemberRepository members, PasswordEncoder passwordEncoder) {
    this.usersRepository = usersRepository;
    this.workspaces = workspaces;
    this.members = members;
    this.passwordEncoder = passwordEncoder;
  }

  /** Lists every space the person belongs to, creating the personal space on first use. */
  @Transactional
  public List<WorkspaceDto> listFor(Long userId) {
    Users user = requireUser(userId);
    ensurePersonal(user);
    return members.findByUser_UserIdOrderByWorkspace_WorkspaceIdAsc(userId).stream()
        .map(this::toDto)
        .toList();
  }

  @Transactional
  public WorkspaceDto create(Long userId, String rawName, String rawType) {
    Users user = requireUser(userId);
    String name = rawName == null ? "" : rawName.trim();
    if (name.isEmpty() || name.length() > 60) {
      throw new IllegalArgumentException("Workspace name must be between 1 and 60 characters");
    }
    WorkspaceType type = parseType(rawType);

    Users dataOwner = usersRepository.save(newServiceAccount(name));
    Workspace workspace = workspaces.save(new Workspace(dataOwner, user, name, type, false));
    members.save(new WorkspaceMember(workspace, user, WorkspaceRole.OWNER));
    return toDto(members.findByWorkspace_WorkspaceIdAndUser_UserId(
        workspace.getWorkspaceId(), userId).orElseThrow());
  }

  /**
   * Returns the user whose rows back the requested space. A missing header falls back to the
   * person's default personal space, which keeps older clients working.
   */
  @Transactional
  public Users resolveDataOwner(Long userId, Long workspaceId) {
    Users user = requireUser(userId);
    if (workspaceId == null) {
      Workspace workspace = ensurePersonal(user).getWorkspace();
      return requireDataOwner(workspace);
    }
    Workspace workspace = workspaces.findById(workspaceId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
    if (!members.existsByWorkspace_WorkspaceIdAndUser_UserId(workspaceId, userId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,
          "You do not have access to this workspace");
    }
    return requireDataOwner(workspace);
  }

  @Transactional(readOnly = true)
  public List<WorkspaceMemberDto> listMembers(Long workspaceId, Long requesterId) {
    requireMembership(workspaceId, requesterId);
    return members.findByWorkspace_WorkspaceIdOrderByMemberIdAsc(workspaceId).stream()
        .map(this::toMemberDto)
        .toList();
  }

  @Transactional
  public WorkspaceMemberDto addMember(Long workspaceId, Long requesterId, String rawEmail) {
    Workspace workspace = requireWorkspace(workspaceId);
    requireOwner(workspaceId, requesterId);
    if (workspace.getWorkspaceType() != WorkspaceType.FAMILY) {
      throw new IllegalArgumentException("Only family spaces can be shared");
    }
    String email = rawEmail == null ? "" : rawEmail.trim();
    Users invited = usersRepository.findByEmailIgnoreCase(email);
    if (invited == null || !Boolean.TRUE.equals(invited.getIsActive())) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND,
          "No FinTrack account uses this email");
    }
    if (members.existsByWorkspace_WorkspaceIdAndUser_UserId(workspaceId, invited.getUserId())) {
      throw new IllegalArgumentException("This person is already a member of the space");
    }
    WorkspaceMember member = members.save(
        new WorkspaceMember(workspace, invited, WorkspaceRole.MEMBER));
    return toMemberDto(member);
  }

  @Transactional
  public void removeMember(Long workspaceId, Long requesterId, Long memberId) {
    requireWorkspace(workspaceId);
    requireOwner(workspaceId, requesterId);
    WorkspaceMember member = members.findById(memberId)
        .filter(candidate -> candidate.getWorkspace().getWorkspaceId().equals(workspaceId))
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found"));
    if (member.getRole() == WorkspaceRole.OWNER) {
      throw new IllegalArgumentException("The space owner cannot be removed");
    }
    members.delete(member);
  }

  private WorkspaceMember ensurePersonal(Users user) {
    List<WorkspaceMember> memberships =
        members.findByUser_UserIdOrderByWorkspace_WorkspaceIdAsc(user.getUserId());
    for (WorkspaceMember membership : memberships) {
      Workspace workspace = membership.getWorkspace();
      if (Boolean.TRUE.equals(workspace.getIsDefault())
          && workspace.getWorkspaceType() == WorkspaceType.PERSONAL) {
        return membership;
      }
    }
    Workspace workspace = workspaces.save(
        new Workspace(user, user, "Personal workspace", WorkspaceType.PERSONAL, true));
    return members.save(new WorkspaceMember(workspace, user, WorkspaceRole.OWNER));
  }

  private Workspace requireWorkspace(Long workspaceId) {
    return workspaces.findById(workspaceId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
  }

  private void requireMembership(Long workspaceId, Long userId) {
    if (!members.existsByWorkspace_WorkspaceIdAndUser_UserId(workspaceId, userId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,
          "You do not have access to this workspace");
    }
  }

  private void requireOwner(Long workspaceId, Long userId) {
    if (!members.existsByWorkspace_WorkspaceIdAndUser_UserIdAndRole(
        workspaceId, userId, WorkspaceRole.OWNER)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,
          "Only the space owner can manage members");
    }
  }

  private Users requireUser(Long userId) {
    return usersRepository.findById(userId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
  }

  private Users requireDataOwner(Workspace workspace) {
    return usersRepository.findById(workspace.getDataOwner().getUserId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Space data not found"));
  }

  private WorkspaceType parseType(String rawType) {
    try {
      return WorkspaceType.valueOf(rawType == null ? "" : rawType.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException ex) {
      throw new IllegalArgumentException("Workspace type must be PERSONAL or FAMILY");
    }
  }

  /** Inactive login-less row that owns a shared space's financial data. */
  private Users newServiceAccount(String workspaceName) {
    Users account = new Users(workspaceName,
        "space-" + UUID.randomUUID() + "@fintrack.local",
        passwordEncoder.encode(UUID.randomUUID().toString()));
    account.setIsActive(false);
    return account;
  }

  private WorkspaceDto toDto(WorkspaceMember membership) {
    Workspace workspace = membership.getWorkspace();
    return new WorkspaceDto(
        workspace.getWorkspaceId(),
        workspace.getName(),
        workspace.getWorkspaceType(),
        membership.getRole(),
        workspace.getIsDefault(),
        members.countByWorkspace_WorkspaceId(workspace.getWorkspaceId()));
  }

  private WorkspaceMemberDto toMemberDto(WorkspaceMember member) {
    Users user = member.getUser();
    return new WorkspaceMemberDto(member.getMemberId(), user.getUserId(), user.getFullName(),
        user.getEmail(), user.getAvatarUrl(), member.getRole());
  }
}
