package com.fintrack.entity;

import java.math.BigDecimal;
import java.time.Instant;
import com.fintrack.enums.AccountType;
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

/** Financial account. Balance is derived from transactions, never stored as a running value. */
@Entity
@Table(name = "Accounts")
public class Accounts {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "AccountId")
  private Long accountId;

  @ManyToOne(optional = false)
  @JoinColumn(name = "UserId", nullable = false)
  private Users user;

  @Column(name = "Name", nullable = false, length = 100)
  private String name;

  @Column(name = "AccountType", nullable = false, length = 30)
  @Enumerated(EnumType.STRING)
  private AccountType accountType;

  @Column(name = "CurrencyCode", nullable = false, length = 3)
  private String currencyCode;

  @Column(name = "OpeningBalance", nullable = false, precision = 19, scale = 4)
  private BigDecimal openingBalance = BigDecimal.ZERO;

  @Column(name = "Description", length = 500)
  private String description;

  @Column(name = "IsArchived", nullable = false)
  private Boolean isArchived = false;

  @Column(name = "CreatedAt", nullable = false)
  private Instant createdAt = Instant.now();

  @Column(name = "UpdatedAt", nullable = false)
  private Instant updatedAt = Instant.now();

  @Version
  @Column(name = "Version")
  private Long version;

  protected Accounts() {}

  public Accounts(Users user, String name, AccountType accountType, String currencyCode,
                  BigDecimal openingBalance, String description) {
    this.user = user;
    this.name = name;
    this.accountType = accountType;
    this.currencyCode = currencyCode;
    this.openingBalance = openingBalance;
    this.description = description;
  }

  // getters / setters
  public Long getAccountId() { return accountId; }
  public void setAccountId(Long accountId) { this.accountId = accountId; }
  public Users getUser() { return user; }
  public void setUser(Users user) { this.user = user; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public AccountType getAccountType() { return accountType; }
  public void setAccountType(AccountType accountType) { this.accountType = accountType; }
  public String getCurrencyCode() { return currencyCode; }
  public void setCurrencyCode(String currencyCode) { this.currencyCode = currencyCode; }
  public BigDecimal getOpeningBalance() { return openingBalance; }
  public void setOpeningBalance(BigDecimal openingBalance) { this.openingBalance = openingBalance; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public Boolean getIsArchived() { return isArchived; }
  public void setIsArchived(Boolean isArchived) { this.isArchived = isArchived; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
  public Long getVersion() { return version; }
  public void setVersion(Long version) { this.version = version; }
}
