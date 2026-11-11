package com.fintrack.controller;

import com.fintrack.reporting.DashboardService;
import com.fintrack.dto.DashboardSummaryDto;
import com.fintrack.dto.CashFlowDto;
import com.fintrack.dto.ExpenseBreakdownDto;
import com.fintrack.dto.DashboardRecentTransactionsDto;
import com.fintrack.security.AppUserDetails;
import com.fintrack.security.WorkspaceContext;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Dashboard — all figures computed by the backend. */
@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

  private final DashboardService dashboardService;
  private final WorkspaceContext workspaceContext;

  public DashboardController(DashboardService dashboardService, WorkspaceContext workspaceContext) {
    this.dashboardService = dashboardService;
    this.workspaceContext = workspaceContext;
  }

  @GetMapping("/summary")
  public DashboardSummaryDto summary(@AuthenticationPrincipal AppUserDetails details,
                                     @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                                     LocalDate startDate,
                                     @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                                     LocalDate endDate,
                                     @RequestParam(required = false) String currency) {
    return dashboardService.summary(workspaceContext.dataOwner(details),
        startDate, endDate, currency);
  }

  @GetMapping("/cash-flow")
  public CashFlowDto cashFlow(@AuthenticationPrincipal AppUserDetails details,
                              @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                              LocalDate startDate,
                              @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                              LocalDate endDate,
                              @RequestParam(required = false) String currency) {
    return dashboardService.cashFlow(workspaceContext.dataOwner(details),
        startDate, endDate, currency);
  }

  @GetMapping("/expense-breakdown")
  public ExpenseBreakdownDto expenseBreakdown(@AuthenticationPrincipal AppUserDetails details,
                                              @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                                              LocalDate startDate,
                                              @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                                              LocalDate endDate,
                                              @RequestParam(required = false) String currency) {
    return dashboardService.expenseBreakdown(workspaceContext.dataOwner(details),
        startDate, endDate, currency);
  }

  @GetMapping("/recent-transactions")
  public DashboardRecentTransactionsDto recent(
      @AuthenticationPrincipal AppUserDetails details,
      @RequestParam(defaultValue = "10") int limit,
      @RequestParam(required = false) String currency) {
    return dashboardService.recent(workspaceContext.dataOwner(details), limit, currency);
  }

  @GetMapping("/insights")
  public com.fintrack.dto.DashboardInsightsDto insights(
      @AuthenticationPrincipal AppUserDetails details,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
      @RequestParam(required = false) String currency) {
    return dashboardService.insights(workspaceContext.dataOwner(details),
        startDate, endDate, currency);
  }
}
