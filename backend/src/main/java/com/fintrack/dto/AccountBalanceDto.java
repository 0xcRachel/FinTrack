package com.fintrack.dto;

import java.math.BigDecimal;

public record AccountBalanceDto(Long accountId, String name, String currencyCode,
                                BigDecimal currentBalance) {}
