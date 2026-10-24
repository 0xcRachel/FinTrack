package com.fintrack.service;

import com.fintrack.dto.BudgetDto;
import com.fintrack.dto.BudgetCreateRequest;
import com.fintrack.dto.BudgetUpdateRequest;
import com.fintrack.dto.BudgetSummaryDto;
import com.fintrack.entity.Budgets;
import com.fintrack.entity.Categories;
import com.fintrack.entity.Users;
import com.fintrack.enums.PeriodType;
import com.fintrack.repository.BudgetsRepository;
import com.fintrack.repository.CategoriesRepository;
import com.fintrack.repository.TransactionsRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Budget business rules:
 *   * spend = actual expense transactions in [startDate, endDate] for the category
 *   * transfers and income never count as spending
 *   * zero budget amount -> utilization undefined (null), never division by zero
 */
@Service
public class BudgetsService {

  private final BudgetsRepository budgetsRepository;
  private final CategoriesRepository categoriesRepository;
  private final TransactionsRepository transactionsRepository;

  public BudgetsService(BudgetsRepository budgetsRepository,
                        CategoriesRepository categoriesRepository,
                        TransactionsRepository transactionsRepository) {
    this.budgetsRepository = budgetsRepository;
    this.categoriesRepository = categoriesRepository;
    this.transactionsRepository = transactionsRepository;
  }

  @Transactional(readOnly = true)
  public List<BudgetDto> listBudgets(Users user) {
    return budgetsRepository.findByUserOrderByStartDateDesc(user).stream()
        .map(this::toDto).collect(Collectors.toList());
  }

  @Transactional(readOnly = true)
  public BudgetDto getBudget(Users user, Long budgetId) {
    Budgets b = budgetsRepository.findById(budgetId)
        .filter(bu -> bu.getUser().getUserId().equals(user.getUserId()))
        .orElseThrow(() -> new IllegalArgumentException("Budget not found"));
    return toDto(b);
  }

  @Transactional
  public BudgetDto createBudget(Users user, BudgetCreateRequest req) {
    validateCurrency(req.currencyCode());
    if (req.amount() == null || req.amount().signum() < 0) {
      throw new IllegalArgumentException("Budget amount must be zero or positive");
    }
    if (req.endDate().isBefore(req.startDate())) {
      throw new IllegalArgumentException("End date must not be earlier than start date");
    }
    Categories cat = categoriesRepository.findById(req.categoryId())
        .filter(c -> c.getUser() == null || c.getUser().getUserId().equals(user.getUserId()))
        .filter(c -> !Boolean.TRUE.equals(c.getIsArchived()))
        .orElseThrow(() -> new IllegalArgumentException("Category not found"));
    if (budgetsRepository.existsByUserAndCategoryAndStartDateAndEndDate(
            user, cat, req.startDate(), req.endDate())) {
      throw new IllegalArgumentException("A budget for this category and period already exists");
    }
    List<Budgets> overlapping = budgetsRepository.findOverlapping(user, req.startDate(),
        req.endDate(), cat.getCategoryId());
    if (!overlapping.isEmpty()) {
      throw new IllegalArgumentException("Budget overlaps an existing one for this category");
    }
    Budgets b = new Budgets(user, cat, req.name(), req.amount(), req.currencyCode(),
        req.periodType(), req.startDate(), req.endDate(), req.warningThresholdPercent());
    return toDto(budgetsRepository.save(b));
  }

  @Transactional
  public BudgetDto updateBudget(Users user, Long budgetId, BudgetUpdateRequest req) {
    Budgets b = budgetsRepository.findById(budgetId)
        .filter(bu -> bu.getUser().getUserId().equals(user.getUserId()))
        .orElseThrow(() -> new IllegalArgumentException("Budget not found"));
    if (req.amount() != null && req.amount().signum() < 0) {
      throw new IllegalArgumentException("Budget amount must be zero or positive");
    }
    LocalDate start = req.startDate() == null ? b.getStartDate() : req.startDate();
    LocalDate end = req.endDate() == null ? b.getEndDate() : req.endDate();
    if (end.isBefore(start)) {
      throw new IllegalArgumentException("End date must not be earlier than start date");
    }
    if (req.name() != null) b.setName(req.name());
    if (req.amount() != null) b.setAmount(req.amount());
    if (req.currencyCode() != null) { validateCurrency(req.currencyCode()); b.setCurrencyCode(req.currencyCode()); }
    if (req.periodType() != null) b.setPeriodType(req.periodType());
    b.setStartDate(start);
    b.setEndDate(end);
    if (req.warningThresholdPercent() != null) {
      if (req.warningThresholdPercent() < 0 || req.warningThresholdPercent() > 100) {
        throw new IllegalArgumentException("Warning threshold must be between 0 and 100");
      }
      b.setWarningThresholdPercent(req.warningThresholdPercent());
    }
    return toDto(budgetsRepository.save(b));
  }

  @Transactional
  public void deleteBudget(Users user, Long budgetId) {
    Budgets b = budgetsRepository.findById(budgetId)
        .filter(bu -> bu.getUser().getUserId().equals(user.getUserId()))
        .orElseThrow(() -> new IllegalArgumentException("Budget not found"));
    budgetsRepository.delete(b);
  }

  @Transactional(readOnly = true)
  public BudgetSummaryDto budgetSummary(Users user, Long budgetId) {
    Budgets b = budgetsRepository.findById(budgetId)
        .filter(bu -> bu.getUser().getUserId().equals(user.getUserId()))
        .orElseThrow(() -> new IllegalArgumentException("Budget not found"));
    BigDecimal actual = transactionsRepository.sumExpenseByCategoryAndDate(
        user, b.getCategory(), b.getStartDate(), b.getEndDate(), b.getCurrencyCode());
    BigDecimal amount = b.getAmount();
    BigDecimal utilization = null;
    BigDecimal remaining = null;
    Boolean warning = null, exceeded = null;
    if (amount != null && amount.signum() > 0 && actual != null) {
      utilization = actual.divide(amount, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));
      remaining = amount.subtract(actual);
      int thr = b.getWarningThresholdPercent() == null ? 80 : b.getWarningThresholdPercent();
      warning = utilization.compareTo(BigDecimal.valueOf(thr)) >= 0;
      exceeded = utilization.compareTo(BigDecimal.valueOf(100)) > 0;
    }
    return new BudgetSummaryDto(b.getBudgetId(), b.getName(), b.getCategory().getName(),
        format(amount), format(actual), format(remaining), utilization, warning, exceeded);
  }

  private BudgetDto toDto(Budgets b) {
    BudgetSummaryDto s = budgetSummary(b.getUser(), b.getBudgetId());
    return new BudgetDto(b.getBudgetId(), b.getName(), b.getCategory().getCategoryId(),
        b.getCategory().getName(), format(b.getAmount()), b.getCurrencyCode(), b.getPeriodType(),
        b.getStartDate(), b.getEndDate(), b.getWarningThresholdPercent(),
        s.actualSpending(), s.remaining(), s.utilizationPercent(), s.warning(), s.exceeded(),
        b.getCreatedAt(), b.getUpdatedAt());
  }

  private void validateCurrency(String code) {
    if (code == null || !code.matches("^[A-Z]{3}$")) {
      throw new IllegalArgumentException("Currency must be a 3-letter uppercase code");
    }
  }

  private static String format(BigDecimal v) { return v == null ? "0.0000" : v.toString(); }
}
