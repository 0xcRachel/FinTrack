package com.fintrack.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DashboardSummaryDto(
    LocalDate periodStart,
    LocalDate periodEnd,
    String totalIncome,
    String totalExpense,
    String netCashFlow,
    String totalBalance,
    BigDecimal budgetUtilizationOverall,
    BigDecimal savingsProgressOverall
) {}
