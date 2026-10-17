package com.fintrack.dto;

import java.math.BigDecimal;

public record AccountBalancesEntry(Long accountId, String name, String accountType,
                                   String currencyCode, String currentBalance) {}
