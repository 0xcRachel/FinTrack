package com.fintrack.controller;

import com.fintrack.dto.WorkspaceAddMemberRequest;
import com.fintrack.dto.WorkspaceCreateRequest;
import com.fintrack.dto.WorkspaceDto;
import com.fintrack.dto.WorkspaceMemberDto;
import com.fintrack.security.AppUserDetails;
import com.fintrack.service.WorkspaceService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Financial spaces: personal spaces plus shared family spaces. */
@RestController
@RequestMapping("/api/v1/workspaces")
public class WorkspacesController {

  private final WorkspaceService workspaceService;

  public WorkspacesController(WorkspaceService workspaceService) {
    this.workspaceService = workspaceService;
  }

  @GetMapping
  public List<WorkspaceDto> list(@AuthenticationPrincipal AppUserDetails details) {
    return workspaceService.listFor(details.getUserId());
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public WorkspaceDto create(@AuthenticationPrincipal AppUserDetails details,
                             @Valid @RequestBody WorkspaceCreateRequest req) {
    return workspaceService.create(details.getUserId(), req.name(), req.type());
  }

  @GetMapping("/{id}/members")
  public List<WorkspaceMemberDto> members(@AuthenticationPrincipal AppUserDetails details,
                                          @PathVariable Long id) {
    return workspaceService.listMembers(id, details.getUserId());
  }

  @PostMapping("/{id}/members")
  @ResponseStatus(HttpStatus.CREATED)
  public WorkspaceMemberDto addMember(@AuthenticationPrincipal AppUserDetails details,
                                      @PathVariable Long id,
                                      @Valid @RequestBody WorkspaceAddMemberRequest req) {
    return workspaceService.addMember(id, details.getUserId(), req.email());
  }

  @DeleteMapping("/{id}/members/{memberId}")
  public ResponseEntity<Void> removeMember(@AuthenticationPrincipal AppUserDetails details,
                                           @PathVariable Long id,
                                           @PathVariable Long memberId) {
    workspaceService.removeMember(id, details.getUserId(), memberId);
    return ResponseEntity.noContent().build();
  }
}
