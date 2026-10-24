package com.fintrack.controller;

import com.fintrack.reporting.ReportsService;
import com.fintrack.dto.TransactionFilter;
import com.fintrack.dto.TransactionPage;
import com.fintrack.service.TransactionService;
import com.fintrack.security.AppUserDetails;
import com.fintrack.entity.Users;
import com.fintrack.repository.UsersRepository;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Reports: income/expense trends, category distributions, budget performance, account balances, CSV export. */
@RestController
@RequestMapping("/api/v1/reports")
public class ReportsController {

  private final ReportsService reportsService;
  private final TransactionService transactionService;
  private final UsersRepository usersRepository;

  public ReportsController(ReportsService reportsService, TransactionService transactionService,
                           UsersRepository usersRepository) {
    this.reportsService = reportsService;
    this.transactionService = transactionService;
    this.usersRepository = usersRepository;
  }

  @GetMapping("/income-expenses")
  public List<ReportsService.MonthlyPoint> incomeExpenses(
      @AuthenticationPrincipal AppUserDetails details,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
      @RequestParam(required = false) String currency) {
    return reportsService.incomeExpenses(usersRepository.getReferenceById(details.getUserId()),
        startDate, endDate, currency);
  }

  @GetMapping("/category-breakdown")
  public List<ReportsService.CategoryDistribution> categoryBreakdown(
      @AuthenticationPrincipal AppUserDetails details,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
      @RequestParam(required = false) String currency) {
    return reportsService.categoryBreakdown(usersRepository.getReferenceById(details.getUserId()),
        startDate, endDate, currency);
  }

  @GetMapping("/budget-performance")
  public List<ReportsService.BudgetPerformance> budgetPerformance(
      @AuthenticationPrincipal AppUserDetails details,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
      @RequestParam(required = false) String currency) {
    return reportsService.budgetPerformance(usersRepository.getReferenceById(details.getUserId()),
        startDate, endDate, currency);
  }

  @GetMapping("/account-balances")
  public List<ReportsService.AccountBalanceRow> accountBalances(
      @AuthenticationPrincipal AppUserDetails details,
      @RequestParam(required = false) String currency) {
    return reportsService.accountBalances(usersRepository.getReferenceById(details.getUserId()), currency);
  }

  @GetMapping("/transactions/export")
  public void exportTransactions(@AuthenticationPrincipal AppUserDetails details,
                                 TransactionFilter filter,
                                 HttpServletResponse response) throws IOException {
    Users user = usersRepository.getReferenceById(details.getUserId());

    // Export ALL matching rows: the service caps page size at 100, so we page through.
    List<com.fintrack.dto.TransactionDto> rows = new ArrayList<>();
    int pageNo = 0;
    int totalPages = 1;
    while (pageNo < totalPages && pageNo < 500) {
      TransactionPage tp = transactionService.listTransactions(user, new TransactionFilter(
          filter.startDate(), filter.endDate(), filter.type(), filter.accountId(),
          filter.categoryId(), filter.search(), pageNo, 100, filter.sort()));
      rows.addAll(tp.content());
      totalPages = tp.totalPages() == null ? 1 : tp.totalPages();
      pageNo++;
    }

    response.setContentType("text/csv; charset=UTF-8");
    response.setCharacterEncoding("UTF-8");
    response.setHeader("Content-Disposition",
        "attachment; filename=\"fintrack-transactions-"
            + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE) + ".csv\"");

    try (PrintWriter out = new PrintWriter(response.getWriter(), true)) {
      // UTF-8 BOM so Excel opens Unicode correctly
      out.write('\uFEFF');
      out.println(csv("TransactionId") + "," + csv("TransactionDate") + "," + csv("Type") + ","
          + csv("Amount") + "," + csv("Currency") + "," + csv("Category") + ","
          + csv("SourceAccount") + "," + csv("DestinationAccount") + ","
          + csv("Description") + "," + csv("Merchant"));
      for (com.fintrack.dto.TransactionDto t : rows) {
        out.println(csv(String.valueOf(t.transactionId())) + "," + csv(String.valueOf(t.transactionDate()))
            + "," + csv(t.transactionType().toString()) + "," + csv(t.amount()) + ","
            + csv(t.currencyCode()) + "," + csv(t.categoryName() == null ? "" : t.categoryName()) + ","
            + csv(t.sourceAccountName() == null ? "" : t.sourceAccountName()) + ","
            + csv(t.destinationAccountName() == null ? "" : t.destinationAccountName()) + ","
            + csv(t.description() == null ? "" : t.description()) + ","
            + csv(t.merchant() == null ? "" : t.merchant()));
      }
    }
  }

  /** Full report bundle as one CSV file: summary, monthly trend, categories, accounts, budgets. */
  @GetMapping("/export/summary")
  public void exportSummary(@AuthenticationPrincipal AppUserDetails details,
                            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
                            @RequestParam(required = false) String currency,
                            HttpServletResponse response) throws IOException {
    Users user = usersRepository.getReferenceById(details.getUserId());

    List<ReportsService.MonthlyPoint> months =
        reportsService.incomeExpenses(user, startDate, endDate, currency);
    List<ReportsService.CategoryDistribution> categories =
        reportsService.categoryBreakdown(user, startDate, endDate, currency);
    List<ReportsService.AccountBalanceRow> accounts = reportsService.accountBalances(user, currency);
    List<ReportsService.BudgetPerformance> budgets =
        reportsService.budgetPerformance(user, startDate, endDate, currency);

    java.math.BigDecimal income = months.stream()
        .map(ReportsService.MonthlyPoint::income).reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
    java.math.BigDecimal expense = months.stream()
        .map(ReportsService.MonthlyPoint::expense).reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

    response.setContentType("text/csv; charset=UTF-8");
    response.setCharacterEncoding("UTF-8");
    response.setHeader("Content-Disposition",
        "attachment; filename=\"fintrack-report-"
            + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE) + ".csv\"");

    try (PrintWriter out = new PrintWriter(response.getWriter(), true)) {
      out.write('\uFEFF');
      out.println("FinTrack report");
      out.println("Period," + csv(startDate.toString()) + "," + csv(endDate.toString()));
      out.println("Currency," + csv(currency == null || currency.isBlank()
          ? "ALL (mixed currencies)" : currency.trim().toUpperCase()));
      out.println();
      out.println("Summary");
      out.println("Metric,Value");
      out.println("Total income," + csv(income.toPlainString()));
      out.println("Total expense," + csv(expense.toPlainString()));
      out.println("Net cash flow," + csv(income.subtract(expense).toPlainString()));
      out.println();
      out.println("Monthly trend");
      out.println("Month,Income,Expense,Net");
      for (ReportsService.MonthlyPoint m : months) {
        out.println(csv(m.month()) + "," + csv(m.income().toPlainString()) + ","
            + csv(m.expense().toPlainString()) + "," + csv(m.net().toPlainString()));
      }
      out.println();
      out.println("Category breakdown");
      out.println("Category,Type,Amount");
      for (ReportsService.CategoryDistribution c : categories) {
        out.println(csv(c.categoryName()) + "," + csv(c.type()) + "," + csv(c.amount().toPlainString()));
      }
      out.println();
      out.println("Account balances");
      out.println("Account,Type,Currency,Balance");
      for (ReportsService.AccountBalanceRow a : accounts) {
        out.println(csv(a.name()) + "," + csv(a.accountType()) + "," + csv(a.currencyCode()) + ","
            + csv(a.balance().toPlainString()));
      }
      out.println();
      out.println("Budget performance");
      out.println("Budget,Category,Budget amount,Actual spending,Utilization percent");
      for (ReportsService.BudgetPerformance b : budgets) {
        out.println(csv(b.name()) + "," + csv(b.categoryName()) + "," + csv(b.budgetAmount()) + ","
            + csv(b.actualSpending()) + ","
            + csv(b.utilizationPercent() == null ? "" : b.utilizationPercent().toPlainString()));
      }
    }
  }

  private static String csv(String v) {
    if (v == null) return "";
    String s = v;
    // Formula-injection guard: cells starting with these are prefixed by a tab
    if (s.startsWith("=") || s.startsWith("+") || s.startsWith("-") || s.startsWith("@")
        || s.startsWith("\t")) {
      s = "\t" + s;
    }
    boolean needsQuotes = s.contains(",") || s.contains("\"") || s.contains("\n")
        || s.contains("\r");
    if (needsQuotes) {
      s = "\"" + s.replace("\"", "\"\"") + "\"";
    }
    return s;
  }
}
