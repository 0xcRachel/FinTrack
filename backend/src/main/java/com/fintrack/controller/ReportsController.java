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
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
    return reportsService.incomeExpenses(usersRepository.getReferenceById(details.getUserId()),
        startDate, endDate);
  }

  @GetMapping("/category-breakdown")
  public List<ReportsService.CategoryDistribution> categoryBreakdown(
      @AuthenticationPrincipal AppUserDetails details,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
    return reportsService.categoryBreakdown(usersRepository.getReferenceById(details.getUserId()),
        startDate, endDate);
  }

  @GetMapping("/budget-performance")
  public List<ReportsService.BudgetPerformance> budgetPerformance(
      @AuthenticationPrincipal AppUserDetails details,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
    return reportsService.budgetPerformance(usersRepository.getReferenceById(details.getUserId()),
        startDate, endDate);
  }

  @GetMapping("/account-balances")
  public List<ReportsService.AccountBalanceRow> accountBalances(
      @AuthenticationPrincipal AppUserDetails details) {
    return reportsService.accountBalances(usersRepository.getReferenceById(details.getUserId()));
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
