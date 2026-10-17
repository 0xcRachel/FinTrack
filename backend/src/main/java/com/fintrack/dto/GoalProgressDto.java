package com.fintrack.dto;

import java.math.BigDecimal;
import com.fintrack.enums.GoalStatus;

public record GoalProgressDto(Long goalId, String name, String targetAmount,
                              String savedAmount, BigDecimal progressPercent,
                              GoalStatus status) {}
