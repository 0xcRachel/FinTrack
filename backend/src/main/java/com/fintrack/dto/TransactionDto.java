package com.fintrack.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import com.fintrack.enums.TransactionType;

public record TransactionDto(
    Long transactionId,
    TransactionType transactionType,
    String amount,
    String currencyCode,
    Long categoryId,
    String categoryName,
    Long sourceAccountId,
    String sourceAccountName,
    Long destinationAccountId,
    String destinationAccountName,
    LocalDate transactionDate,
    String description,
    String merchant,
    Instant createdAt,
    Instant updatedAt
) {}
