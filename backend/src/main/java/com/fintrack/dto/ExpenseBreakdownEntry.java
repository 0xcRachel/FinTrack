package com.fintrack.dto;

import java.math.BigDecimal;

public record ExpenseBreakdownEntry(String categoryId, String categoryName, String amount,
                                    BigDecimal percentOfExpense) {}
