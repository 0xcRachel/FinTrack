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

  @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transactions t WHERE t.user = :user " +
         "AND t.transactionType = 'EXPENSE' AND t.category = :cat " +
         "AND t.transactionDate BETWEEN :start AND :end")
  BigDecimal sumExpenseByCategoryAndDate(@Param("user") Users user,
                                         @Param("cat") Categories cat,
                                         @Param("start") LocalDate start,
                                         @Param("end") LocalDate end);

  @Query("SELECT t.transactionDate, " +
         "SUM(CASE WHEN t.transactionType = 'INCOME' THEN t.amount ELSE 0 END), " +
         "SUM(CASE WHEN t.transactionType = 'EXPENSE' THEN t.amount ELSE 0 END) " +
         "FROM Transactions t WHERE t.user = :user AND t.transactionDate BETWEEN :start AND :end " +
         "GROUP BY t.transactionDate ORDER BY t.transactionDate")
  List<Object[]> dailyCashFlow(@Param("user") Users user,
                               @Param("start") LocalDate start,
                               @Param("end") LocalDate end);

  @Query("SELECT c.categoryId, COALESCE(SUM(t.amount), 0), c.name " +
         "FROM Transactions t JOIN t.category c " +
         "WHERE t.user = :user AND t.transactionType = 'EXPENSE' " +
         "AND t.transactionDate BETWEEN :start AND :end " +
         "GROUP BY c.categoryId, c.name ORDER BY SUM(t.amount) DESC")
  List<Object[]> expenseByCategory(@Param("user") Users user,
                                   @Param("start") LocalDate start,
                                   @Param("end") LocalDate end);

  @Query("SELECT t.transactionId, t.transactionDate, t.description, t.merchant, " +
         "t.transactionType, t.amount, t.currencyCode, " +
         "COALESCE(cat.name, ''), " +
         "CASE WHEN t.transactionType = 'INCOME' THEN dest.name " +
         "WHEN t.transactionType = 'EXPENSE' THEN src.name " +
         "ELSE COALESCE(dest.name, src.name) END " +
         "FROM Transactions t " +
         "LEFT JOIN t.category cat " +
         "LEFT JOIN t.sourceAccount src " +
         "LEFT JOIN t.destinationAccount dest " +
         "WHERE t.user = :user " +
         "ORDER BY t.transactionDate DESC, t.transactionId DESC")
  List<Object[]> recentTransactions(@Param("user") Users user);

  @Query("SELECT YEAR(t.transactionDate), MONTH(t.transactionDate), " +
         "SUM(CASE WHEN t.transactionType = 'INCOME' THEN t.amount ELSE 0 END), " +
         "SUM(CASE WHEN t.transactionType = 'EXPENSE' THEN t.amount ELSE 0 END) " +
         "FROM Transactions t WHERE t.user = :user AND t.transactionDate BETWEEN :start AND :end " +
         "GROUP BY YEAR(t.transactionDate), MONTH(t.transactionDate) " +
         "ORDER BY YEAR(t.transactionDate), MONTH(t.transactionDate)")
  List<Object[]> monthlyIncomeExpense(@Param("user") Users user,
                                      @Param("start") LocalDate start,
                                      @Param("end") LocalDate end);

  @Query("SELECT c.categoryId, COALESCE(SUM(t.amount), 0), c.name " +
         "FROM Transactions t JOIN t.category c " +
         "WHERE t.user = :user AND t.transactionType = 'INCOME' " +
         "AND t.transactionDate BETWEEN :start AND :end " +
         "GROUP BY c.categoryId, c.name ORDER BY SUM(t.amount) DESC")
  List<Object[]> incomeByCategory(@Param("user") Users user,
                                  @Param("start") LocalDate start,
                                  @Param("end") LocalDate end);
}
