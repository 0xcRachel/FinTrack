package com.fintrack.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import com.fintrack.enums.PeriodType;

public record BudgetUpdateRequest(
    String name, BigDecimal amount, String currencyCode, PeriodType periodType,
    LocalDate startDate, LocalDate endDate, Integer warningThresholdPercent
) {}
