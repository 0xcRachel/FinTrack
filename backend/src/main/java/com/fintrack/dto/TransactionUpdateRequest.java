package com.fintrack.dto;

import java.time.LocalDate;
import com.fintrack.enums.TransactionType;

public record TransactionUpdateRequest(
    String amount,
    String currencyCode,
    Long categoryId,
    Long sourceAccountId,
    Long destinationAccountId,
    LocalDate transactionDate,
    String description,
    String merchant
) {}
