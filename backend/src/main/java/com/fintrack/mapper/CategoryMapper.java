package com.fintrack.mapper;

import com.fintrack.dto.CategoryDto;
import com.fintrack.entity.Categories;
import java.math.BigDecimal;

public final class CategoryMapper {

  private CategoryMapper() {}

  public static CategoryDto toDto(Categories c, Long transactionCount, BigDecimal totalSpent) {
    return new CategoryDto(c.getCategoryId(), c.getName(), c.getCategoryType(),
        c.getDescription(), c.getColorHex(), c.getIconName(), c.getIsArchived(),
        transactionCount, totalSpent);
  }
}
