package com.fintrack.reporting;

import com.fintrack.dto.DashboardSummaryDto;
import com.fintrack.dto.CashFlowDto;
import com.fintrack.dto.CashFlowPoint;
import com.fintrack.dto.ExpenseBreakdownDto;
import com.fintrack.dto.ExpenseBreakdownEntry;
import com.fintrack.dto.DashboardRecentTransactionsDto;
import com.fintrack.dto.RecentTransactionDto;
import com.fintrack.entity.Users;
import com.fintrack.enums.TransactionType;
import com.fintrack.repository.TransactionsRepository;
import com.fintrack.repository.AccountsRepository;
import com.fintrack.repository.BudgetsRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Dashboard figures — every number computed by the backend from persisted data. */
@Service
public class DashboardService {

  private final TransactionsRepository transactionsRepository;
  private final AccountsRepository accountsRepository;
  private final BudgetsRepository budgetsRepository;

  public DashboardService(TransactionsRepository transactionsRepository,
                          AccountsRepository accountsRepository,
                          BudgetsRepository budgetsRepository) {
    this.transactionsRepository = transactionsRepository;
    this.accountsRepository = accountsRepository;
    this.budgetsRepository = budgetsRepository;
  }

  @Transactional(readOnly = true)
  public DashboardSummaryDto summary(Users user, LocalDate start, LocalDate end) {
    BigDecimal income = toZero(transactionsRepository.sumIncome(user, start, end));
    BigDecimal expense = toZero(transactionsRepository.sumExpense(user, start, end));

    List<com.fintrack.entity.Accounts> accounts = accountsRepository.findByUserAndIsArchivedFalseOrderByNameAsc(
        user, org.springframework.data.domain.Pageable.unpaged());
    BigDecimal totalBalance = accounts.stream()
        .map(a -> accountBalance(a.getAccountId(), user))
        .reduce(BigDecimal.ZERO, BigDecimal::add);

    BigDecimal budgetUtil = overallBudgetUtilization(user, start, end);

    return new DashboardSummaryDto(start, end,
        format(income), format(expense), format(income.subtract(expense)),
        format(totalBalance), budgetUtil, null);
  }

  @Transactional(readOnly = true)
  public CashFlowDto cashFlow(Users user, LocalDate start, LocalDate end) {
    List<Object[]> rows = transactionsRepository.dailyCashFlow(user, start, end);
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
    List<Object[]> rows = transactionsRepository.expenseByCategory(user, start, end);
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
    List<Object[]> rows = transactionsRepository.recentTransactions(user);
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
    List<com.fintrack.entity.Budgets> budgets = budgetsRepository.findByUserOrderByStartDateDesc(user);
    BigDecimal totalAmount = BigDecimal.ZERO;
    BigDecimal totalActual = BigDecimal.ZERO;
    boolean any = false;
    for (com.fintrack.entity.Budgets b : budgets) {
      if (b.getEndDate().isBefore(start) || b.getStartDate().isAfter(end)) continue;
      BigDecimal actual = transactionsRepository.sumExpenseByCategoryAndDate(
          user, b.getCategory(), b.getStartDate(), b.getEndDate());
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

  private static BigDecimal toZero(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }

  private static String format(BigDecimal v) {
    return v.stripTrailingZeros().toPlainString();
  }
}
