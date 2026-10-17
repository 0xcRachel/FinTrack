package com.fintrack.repository;

import com.fintrack.entity.Accounts;
import com.fintrack.entity.Users;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/** Accounts are never physically deleted — archived instead — preserving transaction history. */
@Repository
public interface AccountsRepository extends JpaRepository<Accounts, Long>, JpaSpecificationExecutor<Accounts> {
  List<Accounts> findByUserAndIsArchivedFalseOrderByNameAsc(Users user, Pageable pageable);
  Page<Accounts> findByUserAndIsArchivedFalse(Users user, Pageable pageable);
  boolean existsByUserAndNameAndIsArchivedFalse(Users user, String name);

  @Query("SELECT MAX(a.updatedAt) FROM Accounts a WHERE a.user = :user")
  Instant findLastUpdatedByUser(@Param("user") Users user);
}
