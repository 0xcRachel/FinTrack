package com.fintrack.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import com.fintrack.enums.GoalStatus;

public record SavingsGoalUpdateRequest(
    String name, BigDecimal targetAmount, String currencyCode, LocalDate targetDate,
    Long linkedAccountId, String description, GoalStatus status
) {}
