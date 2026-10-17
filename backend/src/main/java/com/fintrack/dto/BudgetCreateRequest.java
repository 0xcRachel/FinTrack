package com.fintrack.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import com.fintrack.enums.PeriodType;

public record BudgetCreateRequest(
    String name,
    Long categoryId,
    BigDecimal amount,
    String currencyCode,
    PeriodType periodType,
    LocalDate startDate,
    LocalDate endDate,
    Integer warningThresholdPercent
) {}
