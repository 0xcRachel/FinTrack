package com.fintrack.dto;

import java.math.BigDecimal;
import java.time.Instant;
import com.fintrack.enums.AccountType;

public record AccountDto(
    Long accountId,
    String name,
    AccountType accountType,
    String currencyCode,
    BigDecimal openingBalance,
    BigDecimal currentBalance,
    String description,
    Boolean isArchived,
    Instant createdAt,
    Instant updatedAt
) {}
