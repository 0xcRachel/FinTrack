package com.fintrack.repository;

import com.fintrack.entity.Transactions;
import com.fintrack.entity.Accounts;
import com.fintrack.entity.Categories;
import com.fintrack.enums.TransactionType;
import com.fintrack.entity.Users;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Transaction repository — all queries are user-scoped. Pagination/sorting happen here for large
 * datasets. Sort column allowlist is enforced at the service layer.
 */
@Repository
public interface TransactionsRepository extends JpaRepository<Transactions, Long>, JpaSpecificationExecutor<Transactions> {

  Page<Transactions> findByUserAndTransactionDateBetweenOrderByTransactionDateDesc(
      Users user, LocalDate startDate, LocalDate endDate, Pageable pageable);

  List<Transactions> findByUserAndTransactionTypeAndTransactionDateBetweenOrderByTransactionDateDesc(
      Users user, TransactionType type, LocalDate startDate, LocalDate endDate);

  List<Transactions> findByUserAndSourceAccountAndTransactionDateBetweenOrderByTransactionDateDesc(
      Users user, com.fintrack.entity.Accounts source, LocalDate startDate, LocalDate endDate);

  List<Transactions> findByUserAndDestinationAccountAndTransactionDateBetweenOrderByTransactionDateDesc(
      Users user, com.fintrack.entity.Accounts destination, LocalDate startDate, LocalDate endDate);

  @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transactions t WHERE t.user = :user " +
         "AND t.transactionType = 'INCOME' AND t.transactionDate BETWEEN :start AND :end")
  BigDecimal sumIncome(@Param("user") Users user, @Param("start") LocalDate start, @Param("end") LocalDate end);

  @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transactions t WHERE t.user = :user " +
         "AND t.transactionType = 'EXPENSE' AND t.transactionDate BETWEEN :start AND :end")
  BigDecimal sumExpense(@Param("user") Users user, @Param("start") LocalDate start, @Param("end") LocalDate end);

  @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transactions t WHERE t.user = :user " +
         "AND t.transactionType = 'TRANSFER' AND t.sourceAccount = :account AND " +
         "t.transactionDate BETWEEN :start AND :end")
  BigDecimal sumOutgoingTransfers(@Param("user") Users user, @Param("account") com.fintrack.entity.Accounts account,
                                  @Param("start") LocalDate start, @Param("end") LocalDate end);

  @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transactions t WHERE t.user = :user " +
         "AND t.transactionType = 'TRANSFER' AND t.destinationAccount = :account AND " +
         "t.transactionDate BETWEEN :start AND :end")
  BigDecimal sumIncomingTransfers(@Param("user") Users user,
                                  @Param("account") com.fintrack.entity.Accounts account,
                                  @Param("start") LocalDate start, @Param("end") LocalDate end);

  Optional<Transactions> findByUserAndTransactionId(@Param("user") Users user,
                                                    @Param("transactionId") Long transactionId);

  @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transactions t WHERE t.user = :user " +
         "AND t.transactionType = :type AND t.destinationAccount = :account")
  BigDecimal sumToAccount(@Param("user") Users user, @Param("account") Accounts account,
                          @Param("type") TransactionType type);

  @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transactions t WHERE t.user = :user " +
         "AND t.transactionType = :type AND t.sourceAccount = :account")
  BigDecimal sumFromAccount(@Param("user") Users user, @Param("account") Accounts account,
                            @Param("type") TransactionType type);
}
