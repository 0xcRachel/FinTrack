package com.fintrack.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import com.fintrack.enums.GoalStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/** Savings goal. Progress is derived from GoalContributions (independent ledger). */
@Entity
@Table(name = "SavingsGoals")
public class SavingsGoals {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "GoalId")
  private Long goalId;

  @ManyToOne(optional = false)
  @JoinColumn(name = "UserId", nullable = false)
  private Users user;

  @Column(name = "Name", nullable = false, length = 150)
  private String name;

  @Column(name = "TargetAmount", nullable = false, precision = 19, scale = 4)
  private BigDecimal targetAmount;

  @Column(name = "CurrencyCode", nullable = false, length = 3)
  private String currencyCode;

  @Column(name = "TargetDate")
  private LocalDate targetDate;

  @ManyToOne(optional = true)
  @JoinColumn(name = "LinkedAccountId")
  private Accounts linkedAccount;

  @Column(name = "Description", length = 500)
  private String description;

  @Column(name = "Status", nullable = false, length = 20)
  @Enumerated(EnumType.STRING)
  private GoalStatus status = GoalStatus.ACTIVE;

  @Column(name = "CreatedAt", nullable = false)
  private Instant createdAt = Instant.now();

  @Column(name = "UpdatedAt", nullable = false)
  private Instant updatedAt = Instant.now();

  @Version
  @Column(name = "Version")
  private Long version;

  protected SavingsGoals() {}

  public SavingsGoals(Users user, String name, BigDecimal targetAmount, String currencyCode,
                      LocalDate targetDate, Accounts linkedAccount, String description,
                      GoalStatus status) {
    this.user = user;
    this.name = name;
    this.targetAmount = targetAmount;
    this.currencyCode = currencyCode;
    this.targetDate = targetDate;
    this.linkedAccount = linkedAccount;
    this.description = description;
    this.status = status;
  }

  // getters / setters
  public Long getGoalId() { return goalId; }
  public void setGoalId(Long goalId) { this.goalId = goalId; }
  public Users getUser() { return user; }
  public void setUser(Users user) { this.user = user; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public BigDecimal getTargetAmount() { return targetAmount; }
  public void setTargetAmount(BigDecimal targetAmount) { this.targetAmount = targetAmount; }
  public String getCurrencyCode() { return currencyCode; }
  public void setCurrencyCode(String currencyCode) { this.currencyCode = currencyCode; }
  public LocalDate getTargetDate() { return targetDate; }
  public void setTargetDate(LocalDate targetDate) { this.targetDate = targetDate; }
  public Accounts getLinkedAccount() { return linkedAccount; }
  public void setLinkedAccount(Accounts linkedAccount) { this.linkedAccount = linkedAccount; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public GoalStatus getStatus() { return status; }
  public void setStatus(GoalStatus status) { this.status = status; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
  public Long getVersion() { return version; }
  public void setVersion(Long version) { this.version = version; }
}
