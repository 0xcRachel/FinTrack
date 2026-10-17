package com.fintrack.entity;

import java.time.Instant;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/** User preferences. Never holds passwords or DB credentials. */
@Entity
@Table(name = "ApplicationSettings")
public class ApplicationSettings {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "SettingId")
  private Long settingId;

  @ManyToOne(optional = false)
  @JoinColumn(name = "UserId", nullable = false)
  private Users user;

  @Column(name = "SettingKey", nullable = false, length = 100)
  private String settingKey;

  @Column(name = "SettingValue", length = 1000)
  private String settingValue;

  @Column(name = "UpdatedAt", nullable = false)
  private Instant updatedAt = Instant.now();

  @Version
  @Column(name = "Version")
  private Long version;

  protected ApplicationSettings() {}

  public ApplicationSettings(Users user, String settingKey, String settingValue) {
    this.user = user;
    this.settingKey = settingKey;
    this.settingValue = settingValue;
  }

  // getters / setters
  public Long getSettingId() { return settingId; }
  public void setSettingId(Long settingId) { this.settingId = settingId; }
  public Users getUser() { return user; }
  public void setUser(Users user) { this.user = user; }
  public String getSettingKey() { return settingKey; }
  public void setSettingKey(String settingKey) { this.settingKey = settingKey; }
  public String getSettingValue() { return settingValue; }
  public void setSettingValue(String settingValue) { this.settingValue = settingValue; }
  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
  public Long getVersion() { return version; }
  public void setVersion(Long version) { this.version = version; }
}
