package com.fintrack.service;

import com.fintrack.dto.AccountDto;
import com.fintrack.dto.AccountCreateRequest;
import com.fintrack.dto.AccountUpdateRequest;
import com.fintrack.dto.AccountArchiveRequest;
import com.fintrack.dto.AccountBalanceDto;
import com.fintrack.entity.Accounts;
import com.fintrack.enums.AccountType;
import com.fintrack.enums.TransactionType;
import com.fintrack.entity.Users;
import com.fintrack.repository.AccountsRepository;
import com.fintrack.repository.TransactionsRepository;
import com.fintrack.mapper.AccountMapper;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Account business rules:
 *   * balance is derived (opening + income − expense ± transfers), never stored
 *   * names are unique per user
 *   * archived accounts keep their transaction history
 */
@Service
public class AccountsService {

  private final AccountsRepository accountsRepository;
  private final TransactionsRepository transactionsRepository;

  public AccountsService(AccountsRepository accountsRepository,
                         TransactionsRepository transactionsRepository) {
    this.accountsRepository = accountsRepository;
    this.transactionsRepository = transactionsRepository;
  }

  @Transactional(readOnly = true)
  public Page<AccountDto> listAccounts(Users user, Pageable pageable) {
    return accountsRepository.findByUserAndIsArchivedFalse(user, pageable)
        .map(a -> AccountMapper.toDto(a, computeBalance(a, user)));
  }

  @Transactional(readOnly = true)
  public AccountDto getAccount(Users user, Long accountId) {
    Accounts a = accountsRepository.findById(accountId)
        .filter(ac -> ac.getUser().getUserId().equals(user.getUserId()))
        .orElseThrow(() -> new IllegalArgumentException("Account not found"));
    return AccountMapper.toDto(a, computeBalance(accountId, user));
  }

  @Transactional
  public AccountDto createAccount(Users user, AccountCreateRequest req) {
    validateCurrency(req.currencyCode());
    if (req.openingBalance() == null || req.openingBalance().signum() < 0) {
      throw new IllegalArgumentException("Opening balance must be zero or positive");
    }
    if (accountsRepository.existsByUserAndName(user, req.name())) {
      throw new IllegalArgumentException("An account with this name already exists");
    }
    Accounts a = new Accounts(user, req.name(), req.accountType(), req.currencyCode(),
        req.openingBalance(), req.description());
    Accounts saved = accountsRepository.save(a);
    return AccountMapper.toDto(saved, saved.getOpeningBalance());
  }

  @Transactional
  public AccountDto updateAccount(Users user, Long accountId, AccountUpdateRequest req) {
    Accounts a = accountsRepository.findById(accountId)
        .filter(ac -> ac.getUser().getUserId().equals(user.getUserId()))
        .orElseThrow(() -> new IllegalArgumentException("Account not found"));
    if (req.name() != null && !req.name().equals(a.getName())
        && accountsRepository.existsByUserAndName(user, req.name())) {
      throw new IllegalArgumentException("An account with this name already exists");
    }
    if (req.name() != null) a.setName(req.name());
    if (req.description() != null) a.setDescription(req.description());
    Accounts saved = accountsRepository.save(a);
    return AccountMapper.toDto(saved, computeBalance(accountId, user));
  }

  @Transactional
  public void archiveAccount(Users user, Long accountId, AccountArchiveRequest req) {
    Accounts a = accountsRepository.findById(accountId)
        .filter(ac -> ac.getUser().getUserId().equals(user.getUserId()))
        .orElseThrow(() -> new IllegalArgumentException("Account not found"));
    a.setIsArchived(req.isArchived() != null ? req.isArchived() : true);
    accountsRepository.save(a);
  }

  @Transactional(readOnly = true)
  public List<AccountBalanceDto> accountBalances(Users user) {
    List<Accounts> accounts = accountsRepository.findByUserAndIsArchivedFalseOrderByNameAsc(
        user, org.springframework.data.domain.Pageable.unpaged());
    return accounts.stream()
        .map(a -> new AccountBalanceDto(a.getAccountId(), a.getName(), a.getCurrencyCode(),
            computeBalance(a, user)))
        .toList();
  }

  /** Derived current balance — single source of truth. */
  @Transactional(readOnly = true)
  public BigDecimal computeBalance(Long accountId, Users user) {
    Accounts a = accountsRepository.findById(accountId)
        .filter(ac -> ac.getUser().getUserId().equals(user.getUserId()))
        .orElseThrow(() -> new IllegalArgumentException("Account not found"));
    return computeBalance(a, user);
  }

  /**
   * Derived balance for an account already loaded: opening + income received − expenses paid
   * ± transfers. Income/expense/transfers are account-scoped (destination resp. source).
   */
  @Transactional(readOnly = true)
  public BigDecimal computeBalance(Accounts a, Users user) {
    BigDecimal income = transactionsRepository.sumToAccount(user, a, TransactionType.INCOME);
    BigDecimal expense = transactionsRepository.sumFromAccount(user, a, TransactionType.EXPENSE);
    BigDecimal transferIn = transactionsRepository.sumToAccount(user, a, TransactionType.TRANSFER);
    BigDecimal transferOut = transactionsRepository.sumFromAccount(user, a, TransactionType.TRANSFER);
    return a.getOpeningBalance()
        .add(income)
        .subtract(expense)
        .add(transferIn)
        .subtract(transferOut);
  }

  private void validateCurrency(String code) {
    if (code == null || !code.matches("^[A-Z]{3}$")) {
      throw new IllegalArgumentException("Currency must be a 3-letter uppercase code (e.g. VND, USD)");
    }
  }

  @NotNull
  public Users requireUser(Users user) { return user; }
}
