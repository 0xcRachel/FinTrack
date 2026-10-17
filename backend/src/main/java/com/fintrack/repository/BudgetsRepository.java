package com.fintrack.repository;

import com.fintrack.entity.Budgets;
import com.fintrack.entity.Categories;
import com.fintrack.entity.Users;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface BudgetsRepository extends JpaRepository<Budgets, Long>, JpaSpecificationExecutor<Budgets> {
  List<Budgets> findByUserAndCategoryOrderByStartDateDesc(Users user, Categories category);
  List<Budgets> findByUserOrderByStartDateDesc(Users user);

  @Query("SELECT b FROM Budgets b WHERE b.user = :user AND b.startDate <= :end AND b.endDate >= :start " +
         "AND b.category.id = :categoryId ORDER BY b.startDate DESC")
  List<Budgets> findOverlapping(@Param("user") Users user, @Param("start") LocalDate start,
                                @Param("end") LocalDate end, @Param("categoryId") Long categoryId);

  boolean existsByUserAndCategoryAndStartDateAndEndDate(Users user, Categories category,
      LocalDate startDate, LocalDate endDate);
}
