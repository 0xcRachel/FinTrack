package com.fintrack.repository;

import com.fintrack.entity.WorkspaceMember;
import com.fintrack.enums.WorkspaceRole;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, Long> {
  List<WorkspaceMember> findByUser_UserIdOrderByWorkspace_WorkspaceIdAsc(Long userId);
  List<WorkspaceMember> findByWorkspace_WorkspaceIdOrderByMemberIdAsc(Long workspaceId);
  Optional<WorkspaceMember> findByWorkspace_WorkspaceIdAndUser_UserId(Long workspaceId, Long userId);
  boolean existsByWorkspace_WorkspaceIdAndUser_UserId(Long workspaceId, Long userId);
  boolean existsByWorkspace_WorkspaceIdAndUser_UserIdAndRole(Long workspaceId, Long userId,
                                                              WorkspaceRole role);
  long countByWorkspace_WorkspaceId(Long workspaceId);
}
