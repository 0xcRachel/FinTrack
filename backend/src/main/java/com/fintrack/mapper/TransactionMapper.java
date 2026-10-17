package com.fintrack.mapper;

import com.fintrack.dto.TransactionDto;
import com.fintrack.entity.Accounts;
import com.fintrack.entity.Categories;
import com.fintrack.entity.Transactions;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Locale;

/** Money is formatted as a fixed-scale string so no float ever touches it. */
public final class TransactionMapper {

  private static final NumberFormat FMT = NumberFormat.getInstance(Locale.ROOT);

  static {
    FMT.setMinimumFractionDigits(4);
    FMT.setMaximumFractionDigits(4);
    FMT.setGroupingUsed(false);
  }

  private TransactionMapper() {}

  public static TransactionDto toDto(Transactions t) {
    return new TransactionDto(
        t.getTransactionId(), t.getTransactionType(),
        FMT.format(t.getAmount()), t.getCurrencyCode(),
        safeId(t.getCategory()), safeName(t.getCategory()),
        safeId(t.getSourceAccount()), safeName(t.getSourceAccount()),
        safeId(t.getDestinationAccount()), safeName(t.getDestinationAccount()),
        t.getTransactionDate(), t.getDescription(), t.getMerchant(),
        t.getCreatedAt(), t.getUpdatedAt());
  }

  private static Long safeId(Accounts a) { return a == null ? null : a.getAccountId(); }
  private static Long safeId(Categories c) { return c == null ? null : c.getCategoryId(); }

  private static String safeName(Accounts a) { return a == null ? null : a.getName(); }
  private static String safeName(Categories c) { return c == null ? null : c.getName(); }
}
