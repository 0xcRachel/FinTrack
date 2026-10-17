package com.fintrack.repository;

import com.fintrack.entity.SavingsGoals;
import com.fintrack.enums.GoalStatus;
import com.fintrack.entity.Users;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface SavingsGoalsRepository extends JpaRepository<SavingsGoals, Long>, JpaSpecificationExecutor<SavingsGoals> {
  List<SavingsGoals> findByUserAndStatusOrderByCreatedAtDesc(Users user, GoalStatus status);
  List<SavingsGoals> findByUserOrderByCreatedAtDesc(Users user);
  boolean existsByUserAndNameAndStatusNot(Users user, String name, GoalStatus status);
}
