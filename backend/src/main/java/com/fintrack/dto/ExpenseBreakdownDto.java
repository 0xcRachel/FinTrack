package com.fintrack.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record ExpenseBreakdownDto(LocalDate periodStart, LocalDate periodEnd,
                                  String totalExpense,
                                  List<ExpenseBreakdownEntry> categories) {}
