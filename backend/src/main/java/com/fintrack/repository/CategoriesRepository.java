package com.fintrack.repository;

import com.fintrack.entity.Categories;
import com.fintrack.enums.CategoryType;
import com.fintrack.entity.Users;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/** Categories may be global (user = null) or user-specific. Null user is NOT archivable logic. */
@Repository
public interface CategoriesRepository extends JpaRepository<Categories, Long>, JpaSpecificationExecutor<Categories> {
  List<Categories> findByUserAndIsArchivedFalseAndCategoryTypeOrderByNameAsc(
      Users user, CategoryType type);

  @Query("SELECT c FROM Categories c WHERE (c.user IS NULL OR c.user = :user) " +
         "AND c.isArchived = false AND (:type IS NULL OR c.categoryType = :type) " +
         "ORDER BY c.name ASC")
  Page<Categories> findAccessible(@Param("user") Users user, @Param("type") CategoryType type,
                                  org.springframework.data.domain.Pageable pageable);

  boolean existsByUserAndNameAndCategoryTypeAndIsArchivedFalse(
      Users user, String name, CategoryType type);
  boolean existsByNameAndCategoryTypeAndIsArchivedFalse(String name, CategoryType type);
  boolean existsByUserAndName(Users user, String name);
}
