package com.fintrack.dto;

import java.time.LocalDate;
import com.fintrack.enums.TransactionType;

public record RecentTransactionDto(Long transactionId, LocalDate transactionDate,
                                   String description, String merchant,
                                   TransactionType type,
                                   String amount, String currencyCode,
                                   String categoryName, String accountName) {}
