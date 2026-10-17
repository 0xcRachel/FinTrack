package com.fintrack.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import com.fintrack.enums.PeriodType;

public record BudgetDto(
    Long budgetId,
    String name,
    Long categoryId,
    String categoryName,
    String amount,
    String currencyCode,
    PeriodType periodType,
    LocalDate startDate,
    LocalDate endDate,
    Integer warningThresholdPercent,
    String actualSpending,
    String remaining,
    BigDecimal utilizationPercent,
    Boolean warning,
    Boolean exceeded,
    Instant createdAt,
    Instant updatedAt
) {}
