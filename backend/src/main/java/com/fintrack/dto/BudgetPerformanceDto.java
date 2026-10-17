package com.fintrack.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record BudgetPerformanceDto(LocalDate periodStart, LocalDate periodEnd,
                                   List<BudgetPerformanceEntry> budgets) {}
