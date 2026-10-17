package com.fintrack.dto;

import java.math.BigDecimal;

public record BudgetSummaryDto(Long budgetId, String name, String categoryName,
                               String amount, String actualSpending, String remaining,
                               BigDecimal utilizationPercent, Boolean warning,
                               Boolean exceeded) {}
