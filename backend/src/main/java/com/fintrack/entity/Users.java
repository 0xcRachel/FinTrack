package com.fintrack.entity;

import java.time.Instant;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/** A FinTrack user. One account per person; finances are scoped by userId everywhere. */
@Entity
@Table(name = "Users")
public class Users {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "UserId")
  private Long userId;

  @Column(name = "FullName", nullable = false, length = 100)
  private String fullName;

  @Column(name = "Email", nullable = false, length = 255, unique = true)
  private String email;

  @Column(name = "PasswordHash", nullable = false, length = 255)
  private String passwordHash;

  @Column(name = "IsActive", nullable = false)
  private Boolean isActive = true;

  @Column(name = "CreatedAt", nullable = false)
  private Instant createdAt = Instant.now();

  @Column(name = "UpdatedAt", nullable = false)
  private Instant updatedAt = Instant.now();

  @Version
  @Column(name = "Version")
  private Long version;

  protected Users() {}

  public Users(String fullName, String email, String passwordHash) {
    this.fullName = fullName;
    this.email = email;
    this.passwordHash = passwordHash;
  }

  // getters / setters
  public Long getUserId() { return userId; }
  public void setUserId(Long userId) { this.userId = userId; }
  public String getFullName() { return fullName; }
  public void setFullName(String fullName) { this.fullName = fullName; }
  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }
  public String getPasswordHash() { return passwordHash; }
  public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
  public Boolean getIsActive() { return isActive; }
  public void setIsActive(Boolean isActive) { this.isActive = isActive; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
  public Long getVersion() { return version; }
  public void setVersion(Long version) { this.version = version; }
}
