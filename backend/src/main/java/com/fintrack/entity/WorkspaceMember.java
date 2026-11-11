package com.fintrack.entity;

import com.fintrack.enums.WorkspaceRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

@Entity
@Table(name = "WorkspaceMembers",
    uniqueConstraints = @UniqueConstraint(name = "UqWorkspaceMember", columnNames = {"WorkspaceId", "UserId"}))
public class WorkspaceMember {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "MemberId")
  private Long memberId;

  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  @JoinColumn(name = "WorkspaceId", nullable = false)
  private Workspace workspace;

  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  @JoinColumn(name = "UserId", nullable = false)
  private Users user;

  @Enumerated(EnumType.STRING)
  @Column(name = "Role", nullable = false, length = 16)
  private WorkspaceRole role;

  @Column(name = "JoinedAt", nullable = false)
  private Instant joinedAt = Instant.now();

  protected WorkspaceMember() {}

  public WorkspaceMember(Workspace workspace, Users user, WorkspaceRole role) {
    this.workspace = workspace;
    this.user = user;
    this.role = role;
  }

  public Long getMemberId() { return memberId; }
  public Workspace getWorkspace() { return workspace; }
  public Users getUser() { return user; }
  public WorkspaceRole getRole() { return role; }
  public Instant getJoinedAt() { return joinedAt; }
}
