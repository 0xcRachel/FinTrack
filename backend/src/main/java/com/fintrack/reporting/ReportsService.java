package com.fintrack.reporting;

import com.fintrack.entity.Users;
import com.fintrack.repository.TransactionsRepository;
import com.fintrack.repository.AccountsRepository;
import com.fintrack.repository.BudgetsRepository;
import com.fintrack.repository.SavingsGoalsRepository;
import com.fintrack.repository.GoalContributionsRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Read-only reports — no business mutation here. */
@Service
public class ReportsService {

  private final TransactionsRepository transactionsRepository;
  private final AccountsRepository accountsRepository;
  private final BudgetsRepository budgetsRepository;
  private final SavingsGoalsRepository goalsRepository;
  private final GoalContributionsRepository contributionsRepository;
  private final DashboardService dashboardService;

  public ReportsService(TransactionsRepository transactionsRepository,
                        AccountsRepository accountsRepository,
                        BudgetsRepository budgetsRepository,
                        SavingsGoalsRepository goalsRepository,
                        GoalContributionsRepository contributionsRepository,
                        DashboardService dashboardService) {
    this.transactionsRepository = transactionsRepository;
    this.accountsRepository = accountsRepository;
    this.budgetsRepository = budgetsRepository;
    this.goalsRepository = goalsRepository;
    this.contributionsRepository = contributionsRepository;
    this.dashboardService = dashboardService;
  }

  @Transactional(readOnly = true)
  public List<MonthlyPoint> incomeExpenses(Users user, LocalDate start, LocalDate end) {
    List<Object[]> rows = transactionsRepository.monthlyIncomeExpense(user, start, end);
    return rows.stream()
        .map(r -> new MonthlyPoint(String.valueOf(r[0]) + "-" + String.valueOf(r[1]),
            toDecimal(r[2]), toDecimal(r[3]),
            toDecimal(r[2]).subtract(toDecimal(r[3]))))
        .collect(Collectors.toList());
  }

  @Transactional(readOnly = true)
  public List<CategoryDistribution> categoryBreakdown(Users user, LocalDate start, LocalDate end) {
    List<Object[]> exp = transactionsRepository.expenseByCategory(user, start, end);
    List<Object[]> inc = transactionsRepository.incomeByCategory(user, start, end);
    List<CategoryDistribution> out = new ArrayList<>();
    for (Object[] r : exp) {
      out.add(new CategoryDistribution(String.valueOf(r[0]), String.valueOf(r[2]), "EXPENSE",
          toDecimal(r[1])));
    }
    for (Object[] r : inc) {
      out.add(new CategoryDistribution(String.valueOf(r[0]), String.valueOf(r[2]), "INCOME",
          toDecimal(r[1])));
    }
    return out;
  }

  @Transactional(readOnly = true)
  public List<BudgetPerformance> budgetPerformance(Users user, LocalDate start, LocalDate end) {
    List<com.fintrack.entity.Budgets> budgets = budgetsRepository.findByUserOrderByStartDateDesc(user);
    return budgets.stream()
        .filter(b -> !b.getEndDate().isBefore(start) && !b.getStartDate().isAfter(end))
        .map(b -> {
          LocalDate aStart = b.getStartDate().isAfter(start) ? b.getStartDate() : start;
          LocalDate aEnd = b.getEndDate().isBefore(end) ? b.getEndDate() : end;
          BigDecimal actual = transactionsRepository.sumExpenseByCategoryAndDate(
              user, b.getCategory(), aStart, aEnd);
          BigDecimal amount = b.getAmount();
          BigDecimal util = null;
          if (amount != null && amount.signum() > 0 && actual != null) {
            util = actual.divide(amount, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
          }
          return new BudgetPerformance(b.getBudgetId(), b.getName(),
              b.getCategory().getName(), format(amount), format(toZero(actual)), util);
        }).collect(Collectors.toList());
  }

  @Transactional(readOnly = true)
  public List<AccountBalanceRow> accountBalances(Users user) {
    return accountsRepository.findByUserAndIsArchivedFalseOrderByNameAsc(
        user, org.springframework.data.domain.Pageable.unpaged()).stream()
        .map(a -> new AccountBalanceRow(a.getAccountId(), a.getName(), a.getAccountType().name(),
            a.getCurrencyCode(), dashboardService.accountBalance(a.getAccountId(), user)))
        .collect(Collectors.toList());
  }

  /* ---------- helpers ---------- */

  private static BigDecimal toDecimal(Object o) {
    return o == null ? BigDecimal.ZERO : new BigDecimal(o.toString());
  }

  private static BigDecimal toZero(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }

  private static String format(BigDecimal v) {
    return v == null ? "0.0000" : v.stripTrailingZeros().toPlainString();
  }

  /* ---------- DTOs ---------- */

  public record MonthlyPoint(String month, BigDecimal income, BigDecimal expense,
                             BigDecimal net) {}

  public record CategoryDistribution(String categoryId, String categoryName, String type,
                                     BigDecimal amount) {}

  public record BudgetPerformance(Long budgetId, String name, String categoryName,
                                  String budgetAmount, String actualSpending,
                                  BigDecimal utilizationPercent) {}

  public record AccountBalanceRow(Long accountId, String name, String accountType,
                                  String currencyCode, BigDecimal balance) {}
}
