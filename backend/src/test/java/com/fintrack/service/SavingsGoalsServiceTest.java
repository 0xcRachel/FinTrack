package com.fintrack.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fintrack.dto.SavingsGoalCreateRequest;
import com.fintrack.dto.ContributionCreateRequest;
import com.fintrack.entity.Accounts;
import com.fintrack.entity.SavingsGoals;
import com.fintrack.entity.Users;
import com.fintrack.enums.AccountType;
import com.fintrack.enums.ContributionType;
import com.fintrack.enums.GoalStatus;
import com.fintrack.repository.AccountsRepository;
import com.fintrack.repository.GoalContributionsRepository;
import com.fintrack.repository.SavingsGoalsRepository;
import com.fintrack.repository.UsersRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.transaction.annotation.Transactional;

@DataJpaTest
@Transactional
class SavingsGoalsServiceTest {

  @Autowired SavingsGoalsRepository goalsRepository;
  @Autowired GoalContributionsRepository contributionsRepository;
  @Autowired AccountsRepository accountsRepository;
  @Autowired UsersRepository usersRepository;

  SavingsGoalsService service;
  Users user;
  Accounts bank;

  @BeforeEach
  void setUp() {
    service = new SavingsGoalsService(goalsRepository, accountsRepository, contributionsRepository);
    user = usersRepository.save(new Users("Nguyễn Văn E", "e@example.com", "hash"));
    bank = accountsRepository.save(new Accounts(user, "Bank", AccountType.BANK, "VND",
        new BigDecimal("100000000"), null));
  }

  @Test
  void createAndProgress() {
    var g = service.createGoal(user, new SavingsGoalCreateRequest("Quỹ dự phòng",
        new BigDecimal("100000000"), "VND", LocalDate.of(2027, 6, 30),
        bank.getAccountId(), "6 tháng chi phí"));
    assertThat(g.goalId()).isNotNull();
    assertThat(g.progressPercent()).isEqualByComparingTo("0.0000");

    service.addContribution(user, g.goalId(),
        new ContributionCreateRequest(new BigDecimal("25000000"), LocalDate.of(2026, 10, 10),
            ContributionType.CONTRIBUTION, "lương 10"));
    var p = service.goalProgress(user, g.goalId());
    assertThat(p.savedAmount()).isEqualTo("25000000.0000");
    assertThat(p.progressPercent()).isEqualByComparingTo("25.0000");

    service.addContribution(user, g.goalId(),
        new ContributionCreateRequest(new BigDecimal("15000000"), LocalDate.of(2026, 10, 24),
            ContributionType.CONTRIBUTION, "freelance"));
    assertThat(service.goalProgress(user, g.goalId()).progressPercent())
        .isEqualByComparingTo("40.0000");

    service.addContribution(user, g.goalId(),
        new ContributionCreateRequest(new BigDecimal("5000000"), LocalDate.of(2026, 10, 28),
            ContributionType.WITHDRAWAL, "urgent"));
    assertThat(service.goalProgress(user, g.goalId()).progressPercent())
        .isEqualByComparingTo("35.0000");

    var contribs = service.listContributions(user, g.goalId());
    assertThat(contribs).hasSize(3);
  }

  @Test
  void autoCompleteWhenTargetReached() {
    var g = service.createGoal(user, new SavingsGoalCreateRequest("Small goal",
        new BigDecimal("10000000"), "VND", null, null, null));
    service.addContribution(user, g.goalId(),
        new ContributionCreateRequest(new BigDecimal("10000000"), LocalDate.of(2026, 10, 5),
            ContributionType.CONTRIBUTION, "done"));
    SavingsGoals stored = goalsRepository.findById(g.goalId()).get();
    assertThat(stored.getStatus()).isEqualTo(GoalStatus.COMPLETED);
  }

  @Test
  void invalidAmountsRejected() {
    assertThatThrownBy(() -> service.createGoal(user, new SavingsGoalCreateRequest("X",
        BigDecimal.ZERO, "VND", null, null, null)))
        .isInstanceOf(IllegalArgumentException.class);
    var tmp = goalsRepository.save(new SavingsGoals(user, "tmp", new BigDecimal("1000000"), "VND",
        null, null, null, GoalStatus.ACTIVE));
    assertThatThrownBy(() -> service.addContribution(user, tmp.getGoalId(),
        new ContributionCreateRequest(new BigDecimal("-5000"), LocalDate.of(2026, 10, 5),
            ContributionType.CONTRIBUTION, "bad")))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void notFound() {
    assertThatThrownBy(() -> service.getGoal(user, 999L))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
