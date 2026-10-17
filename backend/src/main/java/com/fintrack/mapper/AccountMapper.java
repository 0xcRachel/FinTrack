package com.fintrack.mapper;

import com.fintrack.dto.AccountDto;
import com.fintrack.entity.Accounts;
import java.math.BigDecimal;

/** Read-only mapping; entities are never exposed directly. */
public final class AccountMapper {

  private AccountMapper() {}

  public static AccountDto toDto(Accounts a, BigDecimal currentBalance) {
    return new AccountDto(
        a.getAccountId(), a.getName(), a.getAccountType(), a.getCurrencyCode(),
        a.getOpeningBalance(), currentBalance, a.getDescription(), a.getIsArchived(),
        a.getCreatedAt(), a.getUpdatedAt());
  }
}
