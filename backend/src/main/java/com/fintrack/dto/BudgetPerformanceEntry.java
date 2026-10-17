package com.fintrack.dto;

import java.math.BigDecimal;

public record BudgetPerformanceEntry(Long budgetId, String name, String categoryName,
                                     String amount, String actualSpending,
                                     BigDecimal utilizationPercent, Boolean warning,
                                     Boolean exceeded) {}
