package com.fintrack.service;

import com.fintrack.dto.SavingsGoalDto;
import com.fintrack.dto.SavingsGoalCreateRequest;
import com.fintrack.dto.SavingsGoalUpdateRequest;
import com.fintrack.dto.ContributionDto;
import com.fintrack.dto.ContributionCreateRequest;
import com.fintrack.dto.GoalProgressDto;
import com.fintrack.entity.SavingsGoals;
import com.fintrack.entity.Accounts;
import com.fintrack.entity.Users;
import com.fintrack.enums.GoalStatus;
import com.fintrack.repository.SavingsGoalsRepository;
import com.fintrack.repository.AccountsRepository;
import com.fintrack.repository.GoalContributionsRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Savings-goal business rules:
 *   * progress = (contributions − withdrawals) / target * 100 — recorded in GoalContributions,
 *     an independent ledger; goal money is NOT double-counted into account balances
 *   * linked account is informational only in this version
 */
@Service
public class SavingsGoalsService {

  private final SavingsGoalsRepository goalsRepository;
  private final AccountsRepository accountsRepository;
  private final GoalContributionsRepository contributionsRepository;

  public SavingsGoalsService(SavingsGoalsRepository goalsRepository,
                             AccountsRepository accountsRepository,
                             GoalContributionsRepository contributionsRepository) {
    this.goalsRepository = goalsRepository;
    this.accountsRepository = accountsRepository;
    this.contributionsRepository = contributionsRepository;
  }

  @Transactional(readOnly = true)
  public List<SavingsGoalDto> listGoals(Users user) {
    return goalsRepository.findByUserOrderByCreatedAtDesc(user).stream()
        .map(this::toDto).collect(Collectors.toList());
  }

  @Transactional(readOnly = true)
  public SavingsGoalDto getGoal(Users user, Long goalId) {
    SavingsGoals g = goalsRepository.findById(goalId)
        .filter(goal -> goal.getUser().getUserId().equals(user.getUserId()))
        .orElseThrow(() -> new IllegalArgumentException("Savings goal not found"));
    return toDto(g);
  }

  @Transactional
  public SavingsGoalDto createGoal(Users user, SavingsGoalCreateRequest req) {
    if (req.targetAmount() == null || req.targetAmount().signum() <= 0) {
      throw new IllegalArgumentException("Target amount must be positive");
    }
    validateCurrency(req.currencyCode());
    Accounts linked = null;
    if (req.linkedAccountId() != null) {
      linked = accountsRepository.findById(req.linkedAccountId())
          .filter(ac -> ac.getUser().getUserId().equals(user.getUserId()))
          .orElseThrow(() -> new IllegalArgumentException("Linked account not found"));
    }
    SavingsGoals g = new SavingsGoals(user, req.name(), req.targetAmount(), req.currencyCode(),
        req.targetDate(), linked, req.description(), GoalStatus.ACTIVE);
    return toDto(goalsRepository.save(g));
  }

  @Transactional
  public SavingsGoalDto updateGoal(Users user, Long goalId, SavingsGoalUpdateRequest req) {
    SavingsGoals g = goalsRepository.findById(goalId)
        .filter(goal -> goal.getUser().getUserId().equals(user.getUserId()))
        .orElseThrow(() -> new IllegalArgumentException("Savings goal not found"));
    if (req.name() != null) g.setName(req.name());
    if (req.targetAmount() != null) {
      if (req.targetAmount().signum() <= 0) {
        throw new IllegalArgumentException("Target amount must be positive");
      }
      g.setTargetAmount(req.targetAmount());
    }
    if (req.currencyCode() != null) { validateCurrency(req.currencyCode()); g.setCurrencyCode(req.currencyCode()); }
    if (req.targetDate() != null) g.setTargetDate(req.targetDate());
    if (req.linkedAccountId() != null) {
      g.setLinkedAccount(accountsRepository.findById(req.linkedAccountId())
          .filter(ac -> ac.getUser().getUserId().equals(user.getUserId()))
          .orElseThrow(() -> new IllegalArgumentException("Linked account not found")));
    }
    if (req.description() != null) g.setDescription(req.description());
    if (req.status() != null) g.setStatus(req.status());
    return toDto(goalsRepository.save(g));
  }

  @Transactional
  public void archiveGoal(Users user, Long goalId) {
    SavingsGoals g = goalsRepository.findById(goalId)
        .filter(goal -> goal.getUser().getUserId().equals(user.getUserId()))
        .orElseThrow(() -> new IllegalArgumentException("Savings goal not found"));
    g.setStatus(GoalStatus.ARCHIVED);
    goalsRepository.save(g);
  }

  @Transactional(readOnly = true)
  public GoalProgressDto goalProgress(Users user, Long goalId) {
    SavingsGoals g = goalsRepository.findById(goalId)
        .filter(goal -> goal.getUser().getUserId().equals(user.getUserId()))
        .orElseThrow(() -> new IllegalArgumentException("Savings goal not found"));
    BigDecimal saved = contributionsRepository.netSaved(g);
    BigDecimal target = g.getTargetAmount();
    BigDecimal progress = null;
    if (target != null && target.signum() > 0 && saved != null) {
      progress = saved.divide(target, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));
    }
    return new GoalProgressDto(g.getGoalId(), g.getName(), format(target), format(saved),
        progress, g.getStatus());
  }

  @Transactional(readOnly = true)
  public List<ContributionDto> listContributions(Users user, Long goalId) {
    SavingsGoals g = goalsRepository.findById(goalId)
        .filter(goal -> goal.getUser().getUserId().equals(user.getUserId()))
        .orElseThrow(() -> new IllegalArgumentException("Savings goal not found"));
    return contributionsRepository.findByGoalOrderByDateDesc(g).stream()
        .map(c -> new ContributionDto(c.getContributionId(), g.getGoalId(),
            format(c.getAmount()), c.getContributionDate(), c.getContributionType(),
            c.getDescription(), c.getCreatedAt()))
        .collect(Collectors.toList());
  }

  @Transactional
  public ContributionDto addContribution(Users user, Long goalId,
                                         ContributionCreateRequest req) {
    SavingsGoals g = goalsRepository.findById(goalId)
        .filter(goal -> goal.getUser().getUserId().equals(user.getUserId()))
        .orElseThrow(() -> new IllegalArgumentException("Savings goal not found"));
    if (req.amount() == null || req.amount().signum() <= 0) {
      throw new IllegalArgumentException("Contribution amount must be positive");
    }
    LocalDate date = req.contributionDate() == null ? LocalDate.now() : req.contributionDate();
    com.fintrack.entity.GoalContributions c = new com.fintrack.entity.GoalContributions(
        g, req.amount(), date, req.contributionType(), req.description());
    com.fintrack.entity.GoalContributions saved = contributionsRepository.save(c);
    BigDecimal netSaved = contributionsRepository.netSaved(g);
    if (netSaved != null && netSaved.compareTo(g.getTargetAmount()) >= 0) {
      g.setStatus(GoalStatus.COMPLETED);
      goalsRepository.save(g);
    }
    return new ContributionDto(saved.getContributionId(), g.getGoalId(),
        format(saved.getAmount()), saved.getContributionDate(), saved.getContributionType(),
        saved.getDescription(), saved.getCreatedAt());
  }

  private SavingsGoalDto toDto(SavingsGoals g) {
    GoalProgressDto p = goalProgress(g.getUser(), g.getGoalId());
    String linkedName = g.getLinkedAccount() == null ? null : g.getLinkedAccount().getName();
    return new SavingsGoalDto(g.getGoalId(), g.getName(), p.targetAmount(),
        p.savedAmount(), p.progressPercent(), g.getCurrencyCode(),
        g.getTargetDate(), g.getLinkedAccount() == null ? null : g.getLinkedAccount().getAccountId(),
        linkedName, g.getDescription(), g.getStatus(), g.getCreatedAt(), g.getUpdatedAt());
  }

  private void validateCurrency(String code) {
    if (code == null || !code.matches("^[A-Z]{3}$")) {
      throw new IllegalArgumentException("Currency must be a 3-letter uppercase code");
    }
  }

  private static String format(BigDecimal v) { return v == null ? "0.0000" : v.toString(); }
}
