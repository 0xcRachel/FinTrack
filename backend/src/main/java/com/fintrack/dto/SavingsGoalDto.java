package com.fintrack.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import com.fintrack.enums.GoalStatus;

public record SavingsGoalDto(
    Long goalId,
    String name,
    String targetAmount,
    String savedAmount,
    BigDecimal progressPercent,
    String currencyCode,
    LocalDate targetDate,
    Long linkedAccountId,
    String linkedAccountName,
    String description,
    GoalStatus status,
    Instant createdAt,
    Instant updatedAt
) {}
