package com.fintrack.repository;

import com.fintrack.entity.GoalContributions;
import com.fintrack.enums.ContributionType;
import com.fintrack.entity.SavingsGoals;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface GoalContributionsRepository
    extends JpaRepository<GoalContributions, Long>, JpaSpecificationExecutor<GoalContributions> {

  @Query("SELECT COALESCE(SUM(CASE WHEN c.contributionType = 'CONTRIBUTION' THEN c.amount " +
         "WHEN c.contributionType = 'WITHDRAWAL' THEN -c.amount ELSE 0 END), 0) " +
         "FROM GoalContributions c WHERE c.goal = :goal")
  BigDecimal netSaved(@Param("goal") SavingsGoals goal);

  @Query("SELECT c FROM GoalContributions c WHERE c.goal = :goal ORDER BY c.contributionDate DESC")
  List<GoalContributions> findByGoalOrderByDateDesc(@Param("goal") SavingsGoals goal);

  @Query("SELECT COUNT(c) FROM GoalContributions c WHERE c.goal = :goal AND c.contributionDate <= :date")
  long countUpTo(@Param("goal") SavingsGoals goal, @Param("date") LocalDate date);
}
