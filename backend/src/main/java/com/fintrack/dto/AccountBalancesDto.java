package com.fintrack.dto;

import java.math.BigDecimal;
import java.util.List;

public record AccountBalancesDto(List<AccountBalancesEntry> accounts,
                                 String totalByCurrency) {}
