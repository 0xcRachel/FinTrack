package com.fintrack.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SavingsGoalCreateRequest(
    String name,
    BigDecimal targetAmount,
    String currencyCode,
    LocalDate targetDate,
    Long linkedAccountId,
    String description
) {}
