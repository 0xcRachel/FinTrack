package com.fintrack.entity;

import com.fintrack.enums.WorkspaceType;
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
import jakarta.persistence.Version;

import java.time.Instant;

/**
 * A financial space. The data owner is the user whose rows hold this space's
 * accounts, categories, and transactions; people access it through membership.
 */
@Entity
@Table(name = "Workspaces",
    uniqueConstraints = @UniqueConstraint(name = "UqWorkspacesDataOwner", columnNames = "DataOwnerUserId"))
public class Workspace {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "WorkspaceId")
  private Long workspaceId;

  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  @JoinColumn(name = "DataOwnerUserId", nullable = false)
  private Users dataOwner;

  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  @JoinColumn(name = "CreatedByUserId", nullable = false)
  private Users createdBy;

  @Column(name = "Name", nullable = false, length = 60)
  private String name;

  @Enumerated(EnumType.STRING)
  @Column(name = "WorkspaceType", nullable = false, length = 16)
  private WorkspaceType workspaceType;

  @Column(name = "IsDefault", nullable = false)
  private Boolean isDefault = false;

  @Column(name = "CreatedAt", nullable = false)
  private Instant createdAt = Instant.now();

  @Column(name = "UpdatedAt", nullable = false)
  private Instant updatedAt = Instant.now();

  @Version
  @Column(name = "Version")
  private Long version;

  protected Workspace() {}

  public Workspace(Users dataOwner, Users createdBy, String name, WorkspaceType workspaceType,
                   boolean isDefault) {
    this.dataOwner = dataOwner;
    this.createdBy = createdBy;
    this.name = name;
    this.workspaceType = workspaceType;
    this.isDefault = isDefault;
  }

  public Long getWorkspaceId() { return workspaceId; }
  public Users getDataOwner() { return dataOwner; }
  public Users getCreatedBy() { return createdBy; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public WorkspaceType getWorkspaceType() { return workspaceType; }
  public Boolean getIsDefault() { return isDefault; }
  public Instant getCreatedAt() { return createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
  public void touch() { this.updatedAt = Instant.now(); }
  public Long getVersion() { return version; }
}
