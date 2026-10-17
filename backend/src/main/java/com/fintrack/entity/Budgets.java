package com.fintrack.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import com.fintrack.enums.PeriodType;
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

@Entity
@Table(name = "Budgets")
public class Budgets {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "BudgetId")
  private Long budgetId;

  @ManyToOne(optional = false)
  @JoinColumn(name = "UserId", nullable = false)
  private Users user;

  @ManyToOne(optional = false)
  @JoinColumn(name = "CategoryId", nullable = false)
  private Categories category;

  @Column(name = "Name", nullable = false, length = 150)
  private String name;

  @Column(name = "Amount", nullable = false, precision = 19, scale = 4)
  private BigDecimal amount;

  @Column(name = "CurrencyCode", nullable = false, length = 3)
  private String currencyCode;

  @Column(name = "PeriodType", nullable = false, length = 20)
  @Enumerated(EnumType.STRING)
  private PeriodType periodType;

  @Column(name = "StartDate", nullable = false)
  private LocalDate startDate;

  @Column(name = "EndDate", nullable = false)
  private LocalDate endDate;

  @Column(name = "WarningThresholdPercent", nullable = false)
  private Integer warningThresholdPercent = 80;

  @Column(name = "CreatedAt", nullable = false)
  private Instant createdAt = Instant.now();

  @Column(name = "UpdatedAt", nullable = false)
  private Instant updatedAt = Instant.now();

  @Version
  @Column(name = "Version")
  private Long version;

  protected Budgets() {}

  public Budgets(Users user, Categories category, String name, BigDecimal amount,
                 String currencyCode, PeriodType periodType, LocalDate startDate,
                 LocalDate endDate, Integer warningThresholdPercent) {
    this.user = user;
    this.category = category;
    this.name = name;
    this.amount = amount;
    this.currencyCode = currencyCode;
    this.periodType = periodType;
    this.startDate = startDate;
    this.endDate = endDate;
    this.warningThresholdPercent = warningThresholdPercent;
  }

  // getters / setters
  public Long getBudgetId() { return budgetId; }
  public void setBudgetId(Long budgetId) { this.budgetId = budgetId; }
  public Users getUser() { return user; }
  public void setUser(Users user) { this.user = user; }
  public Categories getCategory() { return category; }
  public void setCategory(Categories category) { this.category = category; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public BigDecimal getAmount() { return amount; }
  public void setAmount(BigDecimal amount) { this.amount = amount; }
  public String getCurrencyCode() { return currencyCode; }
  public void setCurrencyCode(String currencyCode) { this.currencyCode = currencyCode; }
  public PeriodType getPeriodType() { return periodType; }
  public void setPeriodType(PeriodType periodType) { this.periodType = periodType; }
  public LocalDate getStartDate() { return startDate; }
  public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
  public LocalDate getEndDate() { return endDate; }
  public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
  public Integer getWarningThresholdPercent() { return warningThresholdPercent; }
  public void setWarningThresholdPercent(Integer warningThresholdPercent) { this.warningThresholdPercent = warningThresholdPercent; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
  public Long getVersion() { return version; }
  public void setVersion(Long version) { this.version = version; }
}
