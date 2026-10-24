package com.fintrack.reporting;

import com.fintrack.dto.DashboardSummaryDto;
import com.fintrack.dto.CashFlowDto;
import com.fintrack.dto.CashFlowPoint;
import com.fintrack.dto.ExpenseBreakdownDto;
import com.fintrack.dto.ExpenseBreakdownEntry;
import com.fintrack.dto.DashboardRecentTransactionsDto;
import com.fintrack.dto.RecentTransactionDto;
import com.fintrack.dto.DashboardInsightsDto;
import com.fintrack.entity.Users;
import com.fintrack.enums.TransactionType;
import com.fintrack.enums.GoalStatus;
import com.fintrack.repository.TransactionsRepository;
import com.fintrack.repository.AccountsRepository;
import com.fintrack.repository.BudgetsRepository;
import com.fintrack.repository.SavingsGoalsRepository;
import com.fintrack.repository.GoalContributionsRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Dashboard figures — every number computed by the backend from persisted data. */
@Service
public class DashboardService {

  private final TransactionsRepository transactionsRepository;
  private final AccountsRepository accountsRepository;
  private final BudgetsRepository budgetsRepository;
  private final SavingsGoalsRepository goalsRepository;
  private final GoalContributionsRepository contributionsRepository;

  public DashboardService(TransactionsRepository transactionsRepository,
                          AccountsRepository accountsRepository,
                          BudgetsRepository budgetsRepository,
                          SavingsGoalsRepository goalsRepository,
                          GoalContributionsRepository contributionsRepository) {
    this.transactionsRepository = transactionsRepository;
    this.accountsRepository = accountsRepository;
    this.budgetsRepository = budgetsRepository;
    this.goalsRepository = goalsRepository;
    this.contributionsRepository = contributionsRepository;
  }

  @Transactional(readOnly = true)
  public DashboardSummaryDto summary(Users user, LocalDate start, LocalDate end) {
    return summary(user, start, end, null);
  }

  @Transactional(readOnly = true)
  public DashboardSummaryDto summary(Users user, LocalDate start, LocalDate end, String currency) {
    String lens = normalize(currency);
    BigDecimal income = toZero(transactionsRepository.sumIncome(user, start, end, lens));
    BigDecimal expense = toZero(transactionsRepository.sumExpense(user, start, end, lens));

    BigDecimal totalBalance = totalBalance(user, lens);

    BigDecimal budgetUtil = overallBudgetUtilization(user, start, end, lens);

    return new DashboardSummaryDto(start, end,
        format(income), format(expense), format(income.subtract(expense)),
        format(totalBalance), budgetUtil, null);
  }

  /**
   * Narrative-ready metrics for the insights screen: period-over-period deltas, run rate,
   * top spending category, budget pressure and goal progress.
   */
  @Transactional(readOnly = true)
  public DashboardInsightsDto insights(Users user, LocalDate start, LocalDate end) {
    return insights(user, start, end, null);
  }

  @Transactional(readOnly = true)
  public DashboardInsightsDto insights(Users user, LocalDate start, LocalDate end, String currency) {
    String lens = normalize(currency);
    long days = Math.max(1, ChronoUnit.DAYS.between(start, end) + 1);
    BigDecimal income = toZero(transactionsRepository.sumIncome(user, start, end, lens));
    BigDecimal expense = toZero(transactionsRepository.sumExpense(user, start, end, lens));

    LocalDate previousEnd = start.minusDays(1);
    LocalDate previousStart = previousEnd.minusDays(days - 1);
    BigDecimal previousIncome = toZero(transactionsRepository.sumIncome(user, previousStart, previousEnd, lens));
    BigDecimal previousExpense = toZero(transactionsRepository.sumExpense(user, previousStart, previousEnd, lens));

    BigDecimal savingsRate = income.signum() > 0
        ? income.subtract(expense).divide(income, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
        : null;
    BigDecimal incomeChange = percentChange(previousIncome, income);
    BigDecimal expenseChange = percentChange(previousExpense, expense);
    BigDecimal averageDailySpend = expense.divide(BigDecimal.valueOf(days), 4, RoundingMode.HALF_UP);

    String topName = null;
    String topAmount = null;
    BigDecimal topPercent = null;
    List<Object[]> categories = transactionsRepository.expenseByCategory(user, start, end, lens);
    if (!categories.isEmpty()) {
      Object[] top = categories.get(0);
      BigDecimal amount = toDecimal(top[1]);
      topName = String.valueOf(top[2]);
      topAmount = format(amount);
      topPercent = expense.signum() > 0
          ? amount.divide(expense, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
          : null;
    }

    int budgetCount = 0;
    int overBudget = 0;
    int nearLimit = 0;
    for (com.fintrack.entity.Budgets b : budgetsRepository.findByUserOrderByStartDateDesc(user)) {
      if (lens != null && !lens.equals(b.getCurrencyCode())) continue;
      if (b.getEndDate().isBefore(start) || b.getStartDate().isAfter(end)) continue;
      if (b.getAmount() == null || b.getAmount().signum() <= 0) continue;
      budgetCount++;
      BigDecimal actual = toZero(transactionsRepository.sumExpenseByCategoryAndDate(
          user, b.getCategory(), b.getStartDate(), b.getEndDate(), b.getCurrencyCode()));
      int threshold = b.getWarningThresholdPercent() == null ? 80 : b.getWarningThresholdPercent();
      BigDecimal used = actual.divide(b.getAmount(), 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));
      if (actual.compareTo(b.getAmount()) > 0) {
        overBudget++;
      } else if (used.compareTo(BigDecimal.valueOf(threshold)) >= 0) {
        nearLimit++;
      }
    }

    int activeGoals = 0;
    int completedGoals = 0;
    String topGoalName = null;
    BigDecimal topGoalProgress = null;
    String topGoalRemaining = null;
    String topGoalCurrency = null;
    List<com.fintrack.entity.SavingsGoals> goals = goalsRepository.findByUserOrderByCreatedAtDesc(user);
    com.fintrack.entity.SavingsGoals highlighted = null;
    BigDecimal highlightedSaved = BigDecimal.ZERO;
    for (com.fintrack.entity.SavingsGoals g : goals) {
      if (g.getStatus() == GoalStatus.ARCHIVED) continue;
      if (lens != null && !lens.equals(g.getCurrencyCode())) continue;
      if (g.getStatus() == GoalStatus.COMPLETED) {
        completedGoals++;
        continue;
      }
      activeGoals++;
      BigDecimal saved = toZero(contributionsRepository.netSaved(g));
      if (highlighted == null || completionRatio(g, saved).compareTo(completionRatio(highlighted, highlightedSaved)) > 0) {
        highlighted = g;
        highlightedSaved = saved;
      }
    }
    if (highlighted != null) {
      topGoalName = highlighted.getName();
      topGoalCurrency = highlighted.getCurrencyCode();
      BigDecimal target = highlighted.getTargetAmount();
      topGoalProgress = target != null && target.signum() > 0
          ? highlightedSaved.divide(target, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
          : null;
      topGoalRemaining = format(target == null ? BigDecimal.ZERO : target.subtract(highlightedSaved).max(BigDecimal.ZERO));
    }

    List<com.fintrack.entity.Accounts> accounts = accountsRepository
        .findByUserAndIsArchivedFalseOrderByNameAsc(user, org.springframework.data.domain.Pageable.unpaged());
    Map<String, Integer> currencyCounts = new HashMap<>();
    for (com.fintrack.entity.Accounts a : accounts) {
      currencyCounts.merge(a.getCurrencyCode(), 1, Integer::sum);
    }
    String dominantCurrency = lens != null ? lens : currencyCounts.entrySet().stream()
        .max(Map.Entry.comparingByValue())
        .map(Map.Entry::getKey)
        .orElse(null);
    boolean mixedCurrencies = currencyCounts.size() > 1;

    return new DashboardInsightsDto(start, end, previousStart, previousEnd,
        format(income), format(expense), format(income.subtract(expense)), savingsRate,
        format(previousIncome), format(previousExpense), incomeChange, expenseChange,
        format(averageDailySpend), topName, topAmount, topPercent,
        budgetCount, overBudget, nearLimit,
        activeGoals, completedGoals,
        topGoalName, topGoalProgress, topGoalRemaining, topGoalCurrency,
        mixedCurrencies, dominantCurrency);
  }

  @Transactional(readOnly = true)
  public CashFlowDto cashFlow(Users user, LocalDate start, LocalDate end) {
    return cashFlow(user, start, end, null);
  }

  @Transactional(readOnly = true)
  public CashFlowDto cashFlow(Users user, LocalDate start, LocalDate end, String currency) {
    List<Object[]> rows = transactionsRepository.dailyCashFlow(user, start, end, normalize(currency));
    List<CashFlowPoint> points = rows.stream()
        .map(r -> new CashFlowPoint(
            (LocalDate) r[0],
            format(toDecimal(r[1])), format(toDecimal(r[2])),
            format(toDecimal(r[1]).subtract(toDecimal(r[2])))))
        .collect(Collectors.toList());
    return new CashFlowDto(start, end, points);
  }

  @Transactional(readOnly = true)
  public ExpenseBreakdownDto expenseBreakdown(Users user, LocalDate start, LocalDate end) {
    return expenseBreakdown(user, start, end, null);
  }

  @Transactional(readOnly = true)
  public ExpenseBreakdownDto expenseBreakdown(Users user, LocalDate start, LocalDate end, String currency) {
    List<Object[]> rows = transactionsRepository.expenseByCategory(user, start, end, normalize(currency));
    BigDecimal total = rows.stream().map(r -> toDecimal(r[1])).reduce(BigDecimal.ZERO, BigDecimal::add);
    List<ExpenseBreakdownEntry> entries = rows.stream()
        .map(r -> {
          BigDecimal amt = toDecimal(r[1]);
          BigDecimal pct = total.signum() > 0
              ? amt.divide(total, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
              : BigDecimal.ZERO;
          return new ExpenseBreakdownEntry(String.valueOf(r[0]), String.valueOf(r[2]),
              format(amt), pct);
        }).collect(Collectors.toList());
    return new ExpenseBreakdownDto(start, end, format(total), entries);
  }

  @Transactional(readOnly = true)
  public DashboardRecentTransactionsDto recent(Users user, int limit) {
    return recent(user, limit, null);
  }

  @Transactional(readOnly = true)
  public DashboardRecentTransactionsDto recent(Users user, int limit, String currency) {
    List<Object[]> rows = transactionsRepository.recentTransactions(user, normalize(currency));
    List<RecentTransactionDto> items = rows.stream()
        .limit((long) limit)
        .map(r -> new RecentTransactionDto(((Number) r[0]).longValue(), (LocalDate) r[1],
            String.valueOf(r[2]), String.valueOf(r[3]),
            com.fintrack.enums.TransactionType.valueOf(String.valueOf(r[4])),
            format(toDecimal(r[5])), String.valueOf(r[6]),
            String.valueOf(r[7]), String.valueOf(r[8])))
        .collect(Collectors.toList());
    return new DashboardRecentTransactionsDto(items);
  }

  /* ---------- helpers ---------- */

  private BigDecimal totalBalance(Users user) {
    return totalBalance(user, null);
  }

  private BigDecimal totalBalance(Users user, String currency) {
    List<com.fintrack.entity.Accounts> accounts = accountsRepository
        .findByUserAndIsArchivedFalseOrderByNameAsc(user, org.springframework.data.domain.Pageable.unpaged());
    if (currency != null) {
      accounts = accounts.stream()
          .filter(a -> currency.equals(a.getCurrencyCode()))
          .collect(Collectors.toList());
    }
    Map<Long, BigDecimal> flows = new HashMap<>();
    for (Object[] row : transactionsRepository.inflowByAccount(user)) {
      flows.merge(((Number) row[0]).longValue(), toDecimal(row[1]), BigDecimal::add);
    }
    for (Object[] row : transactionsRepository.outflowByAccount(user)) {
      flows.merge(((Number) row[0]).longValue(), toDecimal(row[1]).negate(), BigDecimal::add);
    }
    return accounts.stream()
        .map(a -> toZero(a.getOpeningBalance()).add(flows.getOrDefault(a.getAccountId(), BigDecimal.ZERO)))
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private static BigDecimal percentChange(BigDecimal previous, BigDecimal current) {
    if (previous == null || previous.signum() == 0) return null;
    return current.subtract(previous)
        .divide(previous, 4, RoundingMode.HALF_UP)
        .multiply(BigDecimal.valueOf(100));
  }

  private static BigDecimal completionRatio(com.fintrack.entity.SavingsGoals goal, BigDecimal saved) {
    if (goal.getTargetAmount() == null || goal.getTargetAmount().signum() <= 0) return BigDecimal.ZERO;
    return saved.divide(goal.getTargetAmount(), 4, RoundingMode.HALF_UP);
  }

  @Transactional(readOnly = true)
  BigDecimal accountBalance(Long accountId, Users user) {
    com.fintrack.entity.Accounts a = accountsRepository.findById(accountId)
        .filter(ac -> ac.getUser().getUserId().equals(user.getUserId()))
        .orElseThrow(() -> new IllegalArgumentException("Account not found"));
    BigDecimal inIncome = transactionsRepository.sumToAccount(user, a, TransactionType.INCOME);
    BigDecimal outExpense = transactionsRepository.sumFromAccount(user, a, TransactionType.EXPENSE);
    BigDecimal transferIn = transactionsRepository.sumToAccount(user, a, TransactionType.TRANSFER);
    BigDecimal transferOut = transactionsRepository.sumFromAccount(user, a, TransactionType.TRANSFER);
    return a.getOpeningBalance()
        .add(toZero(inIncome)).subtract(toZero(outExpense))
        .add(toZero(transferIn)).subtract(toZero(transferOut));
  }

  private BigDecimal overallBudgetUtilization(Users user, LocalDate start, LocalDate end) {
    return overallBudgetUtilization(user, start, end, null);
  }

  private BigDecimal overallBudgetUtilization(Users user, LocalDate start, LocalDate end, String currency) {
    List<com.fintrack.entity.Budgets> budgets = budgetsRepository.findByUserOrderByStartDateDesc(user);
    BigDecimal totalAmount = BigDecimal.ZERO;
    BigDecimal totalActual = BigDecimal.ZERO;
    boolean any = false;
    for (com.fintrack.entity.Budgets b : budgets) {
      if (currency != null && !currency.equals(b.getCurrencyCode())) continue;
      if (b.getEndDate().isBefore(start) || b.getStartDate().isAfter(end)) continue;
      BigDecimal actual = transactionsRepository.sumExpenseByCategoryAndDate(
          user, b.getCategory(), b.getStartDate(), b.getEndDate(), b.getCurrencyCode());
      if (b.getAmount() != null && b.getAmount().signum() > 0) {
        totalAmount = totalAmount.add(b.getAmount());
        totalActual = totalActual.add(toZero(actual));
        any = true;
      }
    }
    return any ? totalActual.divide(totalAmount, 4, RoundingMode.HALF_UP)
        .multiply(BigDecimal.valueOf(100)) : null;
  }

  private static BigDecimal toDecimal(Object o) {
    return o == null ? BigDecimal.ZERO : new BigDecimal(o.toString());
  }

  /** Null means "all currencies". A provided lens must be a 3-letter ISO-style code. */
  private static String normalize(String currency) {
    if (currency == null || currency.isBlank()) return null;
    String code = currency.trim().toUpperCase(Locale.ROOT);
    if (!code.matches("^[A-Z]{3}$")) {
      throw new IllegalArgumentException("Currency must be a 3-letter code");
    }
    return code;
  }

  private static BigDecimal toZero(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }

  private static String format(BigDecimal v) {
    return v.stripTrailingZeros().toPlainString();
  }
}
