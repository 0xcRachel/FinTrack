package com.fintrack.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import com.fintrack.enums.TransactionType;
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

/**
 * Financial transaction. Amount is always positive; direction is implied by type + accounts:
 *   INCOME   : Destination account receives money
 *   EXPENSE  : Source account pays money
 *   TRANSFER : Source decreases, Destination increases; excluded from income/expense aggregates
 */
@Entity
@Table(name = "Transactions")
public class Transactions {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "TransactionId")
  private Long transactionId;

  @ManyToOne(optional = false)
  @JoinColumn(name = "UserId", nullable = false)
  private Users user;

  @Column(name = "TransactionType", nullable = false, length = 10)
  @Enumerated(EnumType.STRING)
  private TransactionType transactionType;

  @Column(name = "Amount", nullable = false, precision = 19, scale = 4)
  private BigDecimal amount;

  @Column(name = "CurrencyCode", nullable = false, length = 3)
  private String currencyCode;

  @ManyToOne(optional = true)
  @JoinColumn(name = "CategoryId")
  private Categories category;

  @ManyToOne(optional = true)
  @JoinColumn(name = "SourceAccountId")
  private Accounts sourceAccount;

  @ManyToOne(optional = true)
  @JoinColumn(name = "DestinationAccountId")
  private Accounts destinationAccount;

  @Column(name = "TransactionDate", nullable = false)
  private LocalDate transactionDate;

  @Column(name = "Description", length = 500)
  private String description;

  @Column(name = "Merchant", length = 200)
  private String merchant;

  @Column(name = "CreatedAt", nullable = false)
  private Instant createdAt = Instant.now();

  @Column(name = "UpdatedAt", nullable = false)
  private Instant updatedAt = Instant.now();

  @Version
  @Column(name = "Version")
  private Long version;

  protected Transactions() {}

  public Transactions(Users user, TransactionType transactionType, BigDecimal amount,
                      String currencyCode, Categories category, Accounts sourceAccount,
                      Accounts destinationAccount, LocalDate transactionDate,
                      String description, String merchant) {
    this.user = user;
    this.transactionType = transactionType;
    this.amount = amount;
    this.currencyCode = currencyCode;
    this.category = category;
    this.sourceAccount = sourceAccount;
    this.destinationAccount = destinationAccount;
    this.transactionDate = transactionDate;
    this.description = description;
    this.merchant = merchant;
  }

  // getters / setters
  public Long getTransactionId() { return transactionId; }
  public void setTransactionId(Long transactionId) { this.transactionId = transactionId; }
  public Users getUser() { return user; }
  public void setUser(Users user) { this.user = user; }
  public TransactionType getTransactionType() { return transactionType; }
  public void setTransactionType(TransactionType transactionType) { this.transactionType = transactionType; }
  public BigDecimal getAmount() { return amount; }
  public void setAmount(BigDecimal amount) { this.amount = amount; }
  public String getCurrencyCode() { return currencyCode; }
  public void setCurrencyCode(String currencyCode) { this.currencyCode = currencyCode; }
  public Categories getCategory() { return category; }
  public void setCategory(Categories category) { this.category = category; }
  public Accounts getSourceAccount() { return sourceAccount; }
  public void setSourceAccount(Accounts sourceAccount) { this.sourceAccount = sourceAccount; }
  public Accounts getDestinationAccount() { return destinationAccount; }
  public void setDestinationAccount(Accounts destinationAccount) { this.destinationAccount = destinationAccount; }
  public LocalDate getTransactionDate() { return transactionDate; }
  public void setTransactionDate(LocalDate transactionDate) { this.transactionDate = transactionDate; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public String getMerchant() { return merchant; }
  public void setMerchant(String merchant) { this.merchant = merchant; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
  public Long getVersion() { return version; }
  public void setVersion(Long version) { this.version = version; }
}
