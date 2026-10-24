package com.fintrack.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Server-computed narrative inputs for the Insights screen. Keeping the arithmetic on the
 * backend guarantees the same numbers as the dashboard and avoids duplicating rounding rules
 * in the client.
 */
public record DashboardInsightsDto(
    LocalDate periodStart,
    LocalDate periodEnd,
    LocalDate previousPeriodStart,
    LocalDate previousPeriodEnd,
    String totalIncome,
    String totalExpense,
    String netCashFlow,
    BigDecimal savingsRate,
    String previousIncome,
    String previousExpense,
    BigDecimal incomeChangePercent,
    BigDecimal expenseChangePercent,
    String averageDailySpend,
    String topCategoryName,
    String topCategoryAmount,
    BigDecimal topCategoryPercent,
    int budgetCount,
    int overBudgetCount,
    int nearLimitCount,
    int activeGoals,
    int completedGoals,
    String topGoalName,
    BigDecimal topGoalProgress,
    String topGoalRemaining,
    String topGoalCurrency,
    boolean mixedCurrencies,
    String dominantCurrency
) {}
