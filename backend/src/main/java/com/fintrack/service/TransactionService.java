package com.fintrack.service;

import com.fintrack.dto.TransactionCreateRequest;
import com.fintrack.dto.TransactionDto;
import com.fintrack.dto.TransactionUpdateRequest;
import com.fintrack.dto.TransactionFilter;
import com.fintrack.dto.TransactionPage;
import com.fintrack.entity.Transactions;
import com.fintrack.entity.Accounts;
import com.fintrack.entity.Categories;
import com.fintrack.entity.Users;
import com.fintrack.enums.TransactionType;
import com.fintrack.repository.TransactionsRepository;
import com.fintrack.repository.AccountsRepository;
import com.fintrack.repository.CategoriesRepository;
import com.fintrack.mapper.TransactionMapper;
import jakarta.validation.constraints.NotNull;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Transaction business rules:
 *   * amount is always positive; direction implied by type + accounts
 *   * INCOME: destination account only; EXPENSE: source account only
 *   * TRANSFER: two distinct accounts, same currency, no category; excluded from income/expense
 *   * all mutations are @Transactional; balances are derived, so edits/deletes stay consistent
 */
@Service
public class TransactionService {

  private static final Set<String> ALLOWED_SORT =
      Set.of("transactionDate", "amount", "createdAt", "description");

  private final TransactionsRepository transactionsRepository;
  private final AccountsRepository accountsRepository;
  private final CategoriesRepository categoriesRepository;

  public TransactionService(TransactionsRepository transactionsRepository,
                            AccountsRepository accountsRepository,
                            CategoriesRepository categoriesRepository) {
    this.transactionsRepository = transactionsRepository;
    this.accountsRepository = accountsRepository;
    this.categoriesRepository = categoriesRepository;
  }

  @Transactional(readOnly = true)
  public TransactionPage listTransactions(Users user, TransactionFilter f) {
    validateFilter(f);
    int page = Math.max(0, f.page() == null ? 0 : f.page());
    int size = Math.min(100, Math.max(1, f.size() == null ? 25 : f.size()));
    PageRequest pr = PageRequest.of(page, size, parseSort(f.sort()));

    // Build dynamic query via repository findAll with specification would be cleaner;
    // here we fetch page filtered in service for clarity on small/medium datasets.
    // NOTE: production-grade filtering uses JpaSpecificationExecutor — kept explicit here.
    Page<Transactions> pageResult = transactionsRepository.findAll(
        (root, query, cb) -> {
          List<Predicate> preds = new java.util.ArrayList<>();
          preds.add(cb.equal(root.get("user"), user));
          if (f.startDate() != null) preds.add(cb.greaterThanOrEqualTo(root.get("transactionDate"), f.startDate()));
          if (f.endDate() != null) preds.add(cb.lessThanOrEqualTo(root.get("transactionDate"), f.endDate()));
          if (f.type() != null) preds.add(cb.equal(root.get("transactionType"), f.type()));
          if (f.accountId() != null) {
            preds.add(cb.or(cb.equal(root.get("sourceAccount").get("accountId"), f.accountId()),
                cb.equal(root.get("destinationAccount").get("accountId"), f.accountId())));
          }
          if (f.categoryId() != null) {
            preds.add(cb.equal(root.get("category").get("categoryId"), f.categoryId()));
          }
          if (f.search() != null && !f.search().isBlank()) {
            String like = "%" + f.search().toLowerCase() + "%";
            preds.add(cb.or(cb.like(cb.lower(root.get("description")), like),
                cb.like(cb.lower(root.get("merchant")), like)));
          }
          return cb.and(preds.toArray(new Predicate[0]));
        }, pr);
    List<TransactionDto> dtos = pageResult.getContent().stream()
        .map(t -> TransactionMapper.toDto(t))
        .collect(Collectors.toList());
    return new TransactionPage(dtos, pageResult.getTotalElements(), page, size,
        pageResult.getTotalPages());
  }

  @Transactional(readOnly = true)
  public TransactionDto getTransaction(Users user, Long id) {
    Transactions t = transactionsRepository.findByUserAndTransactionId(user, id)
        .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));
    return TransactionMapper.toDto(t);
  }

  @Transactional
  public TransactionDto createTransaction(Users user, TransactionCreateRequest req) {
    validateAmount(req.amount());
    validateCurrency(req.currencyCode());
    LocalDate date = req.transactionDate() == null ? LocalDate.now() : req.transactionDate();

    switch (req.transactionType()) {
      case INCOME -> {
        requireNotNull(req.destinationAccountId(), "INCOME requires a destination account");
        requireNull(req.sourceAccountId(), "INCOME must not have a source account");
        requireNotNull(req.categoryId(), "INCOME requires a category");
        Accounts dest = requireAccount(user, req.destinationAccountId());
        checkAccountCurrency(dest, req.currencyCode());
        Categories cat = requireCategory(user, req.categoryId(), TransactionType.INCOME);
        Transactions t = new Transactions(user, TransactionType.INCOME, parseAmount(req.amount()),
            req.currencyCode(), cat, null, dest, date, req.description(), req.merchant());
        return TransactionMapper.toDto(transactionsRepository.save(t));
      }
      case EXPENSE -> {
        requireNotNull(req.sourceAccountId(), "EXPENSE requires a source account");
        requireNull(req.destinationAccountId(), "EXPENSE must not have a destination account");
        requireNotNull(req.categoryId(), "EXPENSE requires a category");
        Accounts src = requireAccount(user, req.sourceAccountId());
        checkAccountCurrency(src, req.currencyCode());
        Categories cat = requireCategory(user, req.categoryId(), TransactionType.EXPENSE);
        Transactions t = new Transactions(user, TransactionType.EXPENSE, parseAmount(req.amount()),
            req.currencyCode(), cat, src, null, date, req.description(), req.merchant());
        return TransactionMapper.toDto(transactionsRepository.save(t));
      }
      case TRANSFER -> {
        requireNotNull(req.sourceAccountId(), "TRANSFER requires a source account");
        requireNotNull(req.destinationAccountId(), "TRANSFER requires a destination account");
        requireNull(req.categoryId(), "TRANSFER must not have a category");
        if (req.sourceAccountId().equals(req.destinationAccountId())) {
          throw new IllegalArgumentException("Transfer source and destination must differ");
        }
        Accounts src = requireAccount(user, req.sourceAccountId());
        Accounts dst = requireAccount(user, req.destinationAccountId());
        checkAccountCurrency(src, req.currencyCode());
        checkAccountCurrency(dst, req.currencyCode());
        Transactions t = new Transactions(user, TransactionType.TRANSFER, parseAmount(req.amount()),
            req.currencyCode(), null, src, dst, date, req.description(), req.merchant());
        return TransactionMapper.toDto(transactionsRepository.save(t));
      }
      default -> throw new IllegalArgumentException("Unknown transaction type");
    }
  }

  @Transactional
  public TransactionDto updateTransaction(Users user, Long id, TransactionUpdateRequest req) {
    Transactions existing = transactionsRepository.findByUserAndTransactionId(user, id)
        .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));
    BigDecimal amount = req.amount() == null ? existing.getAmount() : parseAmount(req.amount());
    if (amount.signum() <= 0) throw new IllegalArgumentException("Amount must be positive");
    String currency = req.currencyCode() == null ? existing.getCurrencyCode() : req.currencyCode();
    validateCurrency(currency);
    LocalDate date = req.transactionDate() == null ? existing.getTransactionDate() : req.transactionDate();
    TransactionType type = existing.getTransactionType();

    switch (type) {
      case INCOME -> {
        Accounts dest = existing.getDestinationAccount();
        checkAccountCurrency(dest, currency);
        Categories cat = req.categoryId() == null ? existing.getCategory()
            : requireCategory(user, req.categoryId(), TransactionType.INCOME);
        existing.setAmount(amount);
        existing.setCurrencyCode(currency);
        existing.setCategory(cat);
        existing.setTransactionDate(date);
        existing.setDescription(req.description());
        existing.setMerchant(req.merchant());
        return TransactionMapper.toDto(transactionsRepository.save(existing));
      }
      case EXPENSE -> {
        Accounts src = existing.getSourceAccount();
        checkAccountCurrency(src, currency);
        Categories cat = req.categoryId() == null ? existing.getCategory()
            : requireCategory(user, req.categoryId(), TransactionType.EXPENSE);
        existing.setAmount(amount);
        existing.setCurrencyCode(currency);
        existing.setCategory(cat);
        existing.setTransactionDate(date);
        existing.setDescription(req.description());
        existing.setMerchant(req.merchant());
        return TransactionMapper.toDto(transactionsRepository.save(existing));
      }
      case TRANSFER -> {
        Accounts src = existing.getSourceAccount();
        Accounts dst = existing.getDestinationAccount();
        checkAccountCurrency(src, currency);
        checkAccountCurrency(dst, currency);
        existing.setAmount(amount);
        existing.setCurrencyCode(currency);
        existing.setTransactionDate(date);
        existing.setDescription(req.description());
        existing.setMerchant(req.merchant());
        return TransactionMapper.toDto(transactionsRepository.save(existing));
      }
      default -> throw new IllegalArgumentException("Unknown transaction type");
    }
  }

  @Transactional
  public void deleteTransaction(Users user, Long id) {
    Transactions t = transactionsRepository.findByUserAndTransactionId(user, id)
        .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));
    transactionsRepository.delete(t);
  }

  /** Derived current balance for an account (single source of truth). */
  @Transactional(readOnly = true)
  public BigDecimal computeBalance(Long accountId, Users user) {
    Accounts a = accountsRepository.findById(accountId)
        .filter(ac -> ac.getUser().getUserId().equals(user.getUserId()))
        .orElseThrow(() -> new IllegalArgumentException("Account not found"));
    BigDecimal inIncome = transactionsRepository.sumToAccount(user, a, TransactionType.INCOME);
    BigDecimal outExpense = transactionsRepository.sumFromAccount(user, a, TransactionType.EXPENSE);
    BigDecimal transferIn = transactionsRepository.sumToAccount(user, a, TransactionType.TRANSFER);
    BigDecimal transferOut = transactionsRepository.sumFromAccount(user, a, TransactionType.TRANSFER);
    return a.getOpeningBalance()
        .add(inIncome == null ? BigDecimal.ZERO : inIncome)
        .subtract(outExpense == null ? BigDecimal.ZERO : outExpense)
        .add(transferIn == null ? BigDecimal.ZERO : transferIn)
        .subtract(transferOut == null ? BigDecimal.ZERO : transferOut);
  }

  /* ---------- helpers ---------- */

  /**
   * Accepts the sort styles used by the UI and API clients:
   *   {@code transactionDate}, {@code transactionDate,desc}, {@code -amount}, {@code amount,asc}.
   * Unknown properties fall back to {@code transactionDate} instead of failing with a 500.
   */
  private static Sort parseSort(String raw) {
    String property = "transactionDate";
    boolean ascending = false;
    if (raw != null && !raw.isBlank()) {
      String value = raw.trim();
      String[] parts = (value.startsWith("-") ? value.substring(1) : value).split(",");
      String candidate = parts[0].trim();
      if (ALLOWED_SORT.contains(candidate)) {
        property = candidate;
      }
      if (parts.length > 1) {
        ascending = "asc".equalsIgnoreCase(parts[1].trim());
      }
    }
    Sort.Order primary = ascending ? Sort.Order.asc(property) : Sort.Order.desc(property);
    return "transactionId".equals(property)
        ? Sort.by(primary)
        : Sort.by(primary, Sort.Order.desc("transactionId"));
  }

  private BigDecimal parseAmount(String s) {
    try {
      return new BigDecimal(s);
    } catch (NumberFormatException ex) {
      throw new IllegalArgumentException("Invalid amount: " + s);
    }
  }

  private void validateAmount(String s) {
    if (s == null || s.isBlank()) throw new IllegalArgumentException("Amount is required");
    BigDecimal v = parseAmount(s);
    if (v.signum() <= 0) throw new IllegalArgumentException("Amount must be positive");
    if (v.scale() > 4) throw new IllegalArgumentException("Amount precision exceeds 4 decimals");
    // plain-string check: reject exponent notation
    if (s.toLowerCase().contains("e")) throw new IllegalArgumentException("Invalid amount format");
  }

  private void validateCurrency(String code) {
    if (code == null || !code.matches("^[A-Z]{3}$")) {
      throw new IllegalArgumentException("Currency must be a 3-letter uppercase code");
    }
  }

  private void requireNotNull(Long v, String msg) {
    if (v == null) throw new IllegalArgumentException(msg);
  }

  private void requireNull(Long v, String msg) {
    if (v != null) throw new IllegalArgumentException(msg);
  }

  @NotNull
  private Accounts requireAccount(Users user, Long accountId) {
    return accountsRepository.findById(accountId)
        .filter(a -> a.getUser().getUserId().equals(user.getUserId()))
        .filter(a -> !Boolean.TRUE.equals(a.getIsArchived()))
        .orElseThrow(() -> new IllegalArgumentException("Account not found or archived"));
  }

  private Categories requireCategory(Users user, Long categoryId, TransactionType type) {
    return categoriesRepository.findById(categoryId)
        .filter(c -> !Boolean.TRUE.equals(c.getIsArchived()))
        .filter(c -> c.getUser() == null || c.getUser().getUserId().equals(user.getUserId()))
        .filter(c -> c.getCategoryType() == com.fintrack.enums.CategoryType.valueOf(type.name()))
        .orElseThrow(() -> new IllegalArgumentException("Category not found or incompatible"));
  }

  private void checkAccountCurrency(Accounts a, String currency) {
    if (!a.getCurrencyCode().equals(currency)) {
      throw new IllegalArgumentException("Account currency mismatch: " + a.getCurrencyCode());
    }
  }

  private void validateFilter(TransactionFilter f) {
    if (f.startDate() != null && f.endDate() != null && f.endDate().isBefore(f.startDate())) {
      throw new IllegalArgumentException("endDate must not be earlier than startDate");
    }
  }
}
