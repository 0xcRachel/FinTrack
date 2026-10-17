package com.fintrack.dto;

public record AccountCreateRequest(
    String name,
    com.fintrack.enums.AccountType accountType,
    String currencyCode,
    java.math.BigDecimal openingBalance,
    String description
) {}
