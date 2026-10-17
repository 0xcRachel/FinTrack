package com.fintrack.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import com.fintrack.enums.ContributionType;
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

/** A contribution or withdrawal toward a savings goal. Standalone ledger entry. */
@Entity
@Table(name = "GoalContributions")
public class GoalContributions {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "ContributionId")
  private Long contributionId;

  @ManyToOne(optional = false)
  @JoinColumn(name = "GoalId", nullable = false)
  private SavingsGoals goal;

  @Column(name = "Amount", nullable = false, precision = 19, scale = 4)
  private BigDecimal amount;

  @Column(name = "ContributionDate", nullable = false)
  private LocalDate contributionDate;

  @Column(name = "ContributionType", nullable = false, length = 20)
  @Enumerated(EnumType.STRING)
  private ContributionType contributionType;

  @Column(name = "Description", length = 500)
  private String description;

  @Column(name = "CreatedAt", nullable = false)
  private Instant createdAt = Instant.now();

  @Version
  @Column(name = "Version")
  private Long version;

  protected GoalContributions() {}

  public GoalContributions(SavingsGoals goal, BigDecimal amount, LocalDate contributionDate,
                           ContributionType contributionType, String description) {
    this.goal = goal;
    this.amount = amount;
    this.contributionDate = contributionDate;
    this.contributionType = contributionType;
    this.description = description;
  }

  // getters / setters
  public Long getContributionId() { return contributionId; }
  public void setContributionId(Long contributionId) { this.contributionId = contributionId; }
  public SavingsGoals getGoal() { return goal; }
  public void setGoal(SavingsGoals goal) { this.goal = goal; }
  public BigDecimal getAmount() { return amount; }
  public void setAmount(BigDecimal amount) { this.amount = amount; }
  public LocalDate getContributionDate() { return contributionDate; }
  public void setContributionDate(LocalDate contributionDate) { this.contributionDate = contributionDate; }
  public ContributionType getContributionType() { return contributionType; }
  public void setContributionType(ContributionType contributionType) { this.contributionType = contributionType; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
  public Long getVersion() { return version; }
  public void setVersion(Long version) { this.version = version; }
}
