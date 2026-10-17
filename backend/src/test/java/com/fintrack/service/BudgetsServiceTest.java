package com.fintrack.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fintrack.dto.BudgetCreateRequest;
import com.fintrack.dto.BudgetUpdateRequest;
import com.fintrack.entity.Accounts;
import com.fintrack.entity.Budgets;
import com.fintrack.entity.Categories;
import com.fintrack.entity.Transactions;
import com.fintrack.entity.Users;
import com.fintrack.enums.AccountType;
import com.fintrack.enums.CategoryType;
import com.fintrack.enums.PeriodType;
import com.fintrack.enums.TransactionType;
import com.fintrack.repository.AccountsRepository;
import com.fintrack.repository.BudgetsRepository;
import com.fintrack.repository.CategoriesRepository;
import com.fintrack.repository.TransactionsRepository;
import com.fintrack.repository.UsersRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.transaction.annotation.Transactional;

@DataJpaTest
@Transactional
class BudgetsServiceTest {

  @Autowired BudgetsRepository budgetsRepository;
  @Autowired CategoriesRepository categoriesRepository;
  @Autowired TransactionsRepository transactionsRepository;
  @Autowired AccountsRepository accountsRepository;
  @Autowired UsersRepository usersRepository;

  BudgetsService service;
  Users user;
  Accounts bank;
  Categories food;

  @BeforeEach
  void setUp() {
    service = new BudgetsService(budgetsRepository, categoriesRepository, transactionsRepository);
    user = usersRepository.save(new Users("Nguyễn Văn D", "d@example.com", "hash"));
    bank = accountsRepository.save(new Accounts(user, "Bank", AccountType.BANK, "VND",
        new BigDecimal("100000000"), null));
    food = categoriesRepository.save(new Categories(user, "Food", CategoryType.EXPENSE,
        null, null, null));
  }

  @Test
  void createAndUtilization() {
    var b = service.createBudget(user, new BudgetCreateRequest("Ăn uống Q4", food.getCategoryId(),
        new BigDecimal("10000000"), "VND", PeriodType.QUARTERLY,
        LocalDate.of(2026, 10, 1), LocalDate.of(2026, 12, 31), 80));
    assertThat(b.budgetId()).isNotNull();

    transactionsRepository.save(new Transactions(user, TransactionType.EXPENSE,
        new BigDecimal("3000000"), "VND", food, bank, null, LocalDate.of(2026, 10, 5),
        "groceries", null));
    transactionsRepository.save(new Transactions(user, TransactionType.EXPENSE,
        new BigDecimal("2000000"), "VND", food, bank, null, LocalDate.of(2026, 10, 10),
        "market", null));

    var s = service.budgetSummary(user, b.budgetId());
    assertThat(s.actualSpending()).isEqualTo("5000000.0000");
    assertThat(s.utilizationPercent()).isEqualByComparingTo("50.0000");
    assertThat(s.warning()).isFalse();
    assertThat(s.exceeded()).isFalse();

    // hit warning threshold
    transactionsRepository.save(new Transactions(user, TransactionType.EXPENSE,
        new BigDecimal("3000000"), "VND", food, bank, null, LocalDate.of(2026, 10, 20),
        "more", null));
    var s2 = service.budgetSummary(user, b.budgetId());
    assertThat(s2.utilizationPercent()).isEqualByComparingTo("80.0000");
    assertThat(s2.warning()).isTrue();
    assertThat(s2.exceeded()).isFalse();
  }

  @Test
  void zeroBudgetNoDivisionByZero() {
    var b = service.createBudget(user, new BudgetCreateRequest("Empty", food.getCategoryId(),
        BigDecimal.ZERO, "VND", PeriodType.MONTHLY,
        LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31), 80));
    var s = service.budgetSummary(user, b.budgetId());
    assertThat(s.utilizationPercent()).isNull();
    assertThat(s.warning()).isNull();
    assertThat(s.exceeded()).isNull();
  }

  @Test
  void overlapRejected() {
    service.createBudget(user, new BudgetCreateRequest("B1", food.getCategoryId(),
        new BigDecimal("1000000"), "VND", PeriodType.MONTHLY,
        LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31), 80));
    assertThatThrownBy(() -> service.createBudget(user, new BudgetCreateRequest("B2",
        food.getCategoryId(), new BigDecimal("1000000"), "VND", PeriodType.MONTHLY,
        LocalDate.of(2026, 10, 15), LocalDate.of(2026, 11, 15), 80)))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void badDatesAndAmountRejected() {
    assertThatThrownBy(() -> service.createBudget(user, new BudgetCreateRequest("X",
        food.getCategoryId(), new BigDecimal("-100"), "VND", PeriodType.MONTHLY,
        LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31), 80)))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> service.createBudget(user, new BudgetCreateRequest("X",
        food.getCategoryId(), new BigDecimal("1000"), "VND", PeriodType.MONTHLY,
        LocalDate.of(2026, 10, 31), LocalDate.of(2026, 10, 1), 80)))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void updateAndDelete() {
    var b = service.createBudget(user, new BudgetCreateRequest("B1", food.getCategoryId(),
        new BigDecimal("1000000"), "VND", PeriodType.MONTHLY,
        LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31), 80));
    service.updateBudget(user, b.budgetId(), new BudgetUpdateRequest("B1 renamed",
        new BigDecimal("2000000"), null, null, null, null, 90));
    var s = service.budgetSummary(user, b.budgetId());
    assertThat(s.utilizationPercent()).isEqualByComparingTo("0.0000");

    service.deleteBudget(user, b.budgetId());
    assertThatThrownBy(() -> service.getBudget(user, b.budgetId()))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
