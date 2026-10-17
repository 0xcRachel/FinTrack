package com.fintrack.controller;

import com.fintrack.reporting.DashboardService;
import com.fintrack.dto.DashboardSummaryDto;
import com.fintrack.dto.CashFlowDto;
import com.fintrack.dto.ExpenseBreakdownDto;
import com.fintrack.dto.DashboardRecentTransactionsDto;
import com.fintrack.security.AppUserDetails;
import com.fintrack.entity.Users;
import com.fintrack.repository.UsersRepository;
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
  private final UsersRepository usersRepository;

  public DashboardController(DashboardService dashboardService, UsersRepository usersRepository) {
    this.dashboardService = dashboardService;
    this.usersRepository = usersRepository;
  }

  @GetMapping("/summary")
  public DashboardSummaryDto summary(@AuthenticationPrincipal AppUserDetails details,
                                     @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                                     LocalDate startDate,
                                     @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                                     LocalDate endDate) {
    return dashboardService.summary(usersRepository.getReferenceById(details.getUserId()),
        startDate, endDate);
  }

  @GetMapping("/cash-flow")
  public CashFlowDto cashFlow(@AuthenticationPrincipal AppUserDetails details,
                              @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                              LocalDate startDate,
                              @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                              LocalDate endDate) {
    return dashboardService.cashFlow(usersRepository.getReferenceById(details.getUserId()),
        startDate, endDate);
  }

  @GetMapping("/expense-breakdown")
  public ExpenseBreakdownDto expenseBreakdown(@AuthenticationPrincipal AppUserDetails details,
                                              @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                                              LocalDate startDate,
                                              @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                                              LocalDate endDate) {
    return dashboardService.expenseBreakdown(usersRepository.getReferenceById(details.getUserId()),
        startDate, endDate);
  }

  @GetMapping("/recent-transactions")
  public DashboardRecentTransactionsDto recent(
      @AuthenticationPrincipal AppUserDetails details,
      @RequestParam(defaultValue = "10") int limit) {
    return dashboardService.recent(usersRepository.getReferenceById(details.getUserId()), limit);
  }
}
