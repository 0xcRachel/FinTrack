package com.fintrack.dto;

import java.math.BigDecimal;
import com.fintrack.enums.CategoryType;

public record CategoryDto(
    Long categoryId,
    String name,
    CategoryType categoryType,
    String description,
    String colorHex,
    String iconName,
    Boolean isArchived,
    Long transactionCount,
    BigDecimal totalSpent
) {}
