package com.fintrack.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fintrack.dto.TransactionCreateRequest;
import com.fintrack.dto.TransactionFilter;
import com.fintrack.dto.TransactionDto;
import com.fintrack.dto.TransactionUpdateRequest;
import com.fintrack.entity.Accounts;
import com.fintrack.entity.Categories;
import com.fintrack.entity.Users;
import com.fintrack.enums.AccountType;
import com.fintrack.enums.CategoryType;
import com.fintrack.enums.TransactionType;
import com.fintrack.repository.AccountsRepository;
import com.fintrack.repository.CategoriesRepository;
import com.fintrack.repository.TransactionsRepository;
import com.fintrack.repository.UsersRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

@DataJpaTest
@Transactional
class TransactionServiceTest {

  @Autowired TransactionsRepository transactionsRepository;
  @Autowired AccountsRepository accountsRepository;
  @Autowired CategoriesRepository categoriesRepository;
  @Autowired UsersRepository usersRepository;

  TransactionService service;
  Users user;
  Accounts bank, cash;
  Categories food, salary;

  @BeforeEach
  void setUp() {
    service = new TransactionService(transactionsRepository, accountsRepository, categoriesRepository);
    user = usersRepository.save(new Users("Nguyá»…n VÄƒn C", "c@example.com", "hash"));
    bank = accountsRepository.save(new Accounts(user, "Bank", AccountType.BANK, "VND",
        new BigDecimal("100000000"), null));
    cash = accountsRepository.save(new Accounts(user, "Cash", AccountType.CASH, "VND",
        new BigDecimal("20000000"), null));
    food = categoriesRepository.save(new Categories(user, "Food", CategoryType.EXPENSE,
        null, null, null));
    salary = categoriesRepository.save(new Categories(null, "Salary", CategoryType.INCOME,
        null, null, null));
  }

  private TransactionCreateRequest income(BigDecimal amount, Accounts acc, Categories cat) {
    TransactionCreateRequest r = new TransactionCreateRequest(TransactionType.INCOME,
        amount.toString(), "VND", cat.getCategoryId(), null, acc.getAccountId(),
        LocalDate.of(2026, 10, 5), "pay", "Employer");
    return r;
  }

  @Test
  void incomeIncreasesDestinationBalance() {
    var dto = service.createTransaction(user, income(new BigDecimal("30000000"), bank, salary));
    assertThat(dto.transactionId()).isNotNull();
    BigDecimal bal = service.computeBalance(bank.getAccountId(), user);
    assertThat(bal).isEqualByComparingTo("130000000.0000");
  }

  @Test
  void expenseDecreasesSourceBalance() {
    TransactionCreateRequest r = new TransactionCreateRequest(TransactionType.EXPENSE,
        "8000000", "VND", food.getCategoryId(), bank.getAccountId(), null,
        LocalDate.of(2026, 10, 6), "rent", null);
    service.createTransaction(user, r);
    BigDecimal bal = service.computeBalance(bank.getAccountId(), user);
    assertThat(bal).isEqualByComparingTo("92000000.0000");
  }

  @Test
  void transferMovesBothAccountsAndIsExcludedFromIncomeExpense() {
    TransactionCreateRequest r = new TransactionCreateRequest(TransactionType.TRANSFER,
        "5000000", "VND", null, bank.getAccountId(), cash.getAccountId(),
        LocalDate.of(2026, 10, 8), "cash out", null);
    var dto = service.createTransaction(user, r);
    assertThat(dto.transactionId()).isNotNull();
    assertThat(service.computeBalance(bank.getAccountId(), user))
        .isEqualByComparingTo("95000000.0000");
    assertThat(service.computeBalance(cash.getAccountId(), user))
        .isEqualByComparingTo("25000000.0000");

    assertThat(transactionsRepository.sumIncome(user, null, null))
        .isEqualByComparingTo(BigDecimal.ZERO);
    assertThat(transactionsRepository.sumExpense(user, null, null))
        .isEqualByComparingTo(BigDecimal.ZERO);
  }

  @Test
  void sameAccountTransferRejected() {
    TransactionCreateRequest r = new TransactionCreateRequest(TransactionType.TRANSFER,
        "1000", "VND", null, bank.getAccountId(), bank.getAccountId(),
        LocalDate.of(2026, 10, 8), "x", null);
    assertThatThrownBy(() -> service.createTransaction(user, r))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("differ");
  }

  @Test
  void negativeAmountRejected() {
    TransactionCreateRequest r = new TransactionCreateRequest(TransactionType.EXPENSE,
        "-500", "VND", food.getCategoryId(), bank.getAccountId(), null,
        LocalDate.of(2026, 10, 6), "x", null);
    assertThatThrownBy(() -> service.createTransaction(user, r))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void zeroAmountRejected() {
    TransactionCreateRequest r = new TransactionCreateRequest(TransactionType.EXPENSE,
        "0", "VND", food.getCategoryId(), bank.getAccountId(), null,
        LocalDate.of(2026, 10, 6), "x", null);
    assertThatThrownBy(() -> service.createTransaction(user, r))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void tooPreciseAmountRejected() {
    TransactionCreateRequest r = new TransactionCreateRequest(TransactionType.EXPENSE,
        "1.23456", "VND", food.getCategoryId(), bank.getAccountId(), null,
        LocalDate.of(2026, 10, 6), "x", null);
    assertThatThrownBy(() -> service.createTransaction(user, r))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void categoryTypeMismatchRejected() {
    TransactionCreateRequest r = new TransactionCreateRequest(TransactionType.INCOME,
        "1000", "VND", food.getCategoryId(), null, bank.getAccountId(),
        LocalDate.of(2026, 10, 6), "x", null);
    assertThatThrownBy(() -> service.createTransaction(user, r))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void archivedAccountBlocked() {
    Accounts arch = accountsRepository.save(new Accounts(user, "Arch", AccountType.CASH, "VND",
        BigDecimal.ZERO, null));
    arch.setIsArchived(true);
    accountsRepository.save(arch);
    TransactionCreateRequest r = new TransactionCreateRequest(TransactionType.EXPENSE,
        "1000", "VND", food.getCategoryId(), arch.getAccountId(), null,
        LocalDate.of(2026, 10, 6), "x", null);
    assertThatThrownBy(() -> service.createTransaction(user, r))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void updateAndDeleteKeepDerivedBalanceConsistent() {
    var created = service.createTransaction(user, income(new BigDecimal("30000000"), bank, salary));
    BigDecimal before = service.computeBalance(bank.getAccountId(), user);

    TransactionUpdateRequest upd = new TransactionUpdateRequest("10000000", "VND",
        salary.getCategoryId(), null, bank.getAccountId(), LocalDate.of(2026, 10, 5), "edited", null);
    service.updateTransaction(user, created.transactionId(), upd);
    assertThat(service.computeBalance(bank.getAccountId(), user))
        .isEqualByComparingTo(before.subtract(new BigDecimal("20000000")));

    service.deleteTransaction(user, created.transactionId());
    assertThat(service.computeBalance(bank.getAccountId(), user))
        .isEqualByComparingTo(new BigDecimal("100000000.0000"));
  }

  @Test
  void listFiltersAndPagination() {
    service.createTransaction(user, income(new BigDecimal("30000000"), bank, salary));
    TransactionCreateRequest r = new TransactionCreateRequest(TransactionType.EXPENSE,
        "8000000", "VND", food.getCategoryId(), bank.getAccountId(), null,
        LocalDate.of(2026, 10, 6), "rent", null);
    service.createTransaction(user, r);

    var f = new TransactionFilter(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31),
        null, null, null, null, 0, 10, null);
    var page = service.listTransactions(user, f);
    assertThat(page.content()).hasSize(2);
    assertThat(page.totalElements()).isEqualTo(2);
    assertThat(page.page()).isEqualTo(0);
    assertThat(page.totalPages()).isEqualTo(1);

    var f2 = new TransactionFilter(null, null, TransactionType.INCOME, null, null, null,
        0, 10, null);
    assertThat(service.listTransactions(user, f2).content()).hasSize(1);

    var f3 = new TransactionFilter(null, null, null, bank.getAccountId(), null, null, 0, 10, null);
    assertThat(service.listTransactions(user, f3).content()).hasSize(2);

    var f4 = new TransactionFilter(null, null, null, null, null, "pay", 0, 10, null);
    assertThat(service.listTransactions(user, f4).content()).hasSize(1);
  }

  @Test
  void notFoundOnForeignId() {
    Users other = usersRepository.save(new Users("Other", "o@example.com", "hash"));
    Accounts otherAcc = accountsRepository.save(new Accounts(other, "OtherAcc",
        AccountType.CASH, "VND", BigDecimal.ZERO, null));
    Categories otherCat = categoriesRepository.save(new Categories(other, "OtherCat",
        CategoryType.EXPENSE, null, null, null));
    TransactionCreateRequest r = new TransactionCreateRequest(TransactionType.EXPENSE,
        "1000", "VND", otherCat.getCategoryId(), otherAcc.getAccountId(), null,
        LocalDate.of(2026, 10, 6), "x", null);
    var dto = service.createTransaction(other, r);
    assertThatThrownBy(() -> service.getTransaction(user, dto.transactionId()))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> service.deleteTransaction(user, dto.transactionId()))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void badEndDateRejected() {
    assertThatThrownBy(() -> service.listTransactions(user,
        new TransactionFilter(LocalDate.of(2026, 10, 31), LocalDate.of(2026, 10, 1),
            null, null, null, null, 0, 10, null)))
        .isInstanceOf(IllegalArgumentException.class);
  }
}

