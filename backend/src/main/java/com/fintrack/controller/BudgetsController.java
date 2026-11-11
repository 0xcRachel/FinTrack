package com.fintrack.controller;

import com.fintrack.dto.BudgetDto;
import com.fintrack.dto.BudgetCreateRequest;
import com.fintrack.dto.BudgetUpdateRequest;
import com.fintrack.dto.BudgetSummaryDto;
import com.fintrack.security.AppUserDetails;
import com.fintrack.security.WorkspaceContext;
import com.fintrack.entity.Users;
import com.fintrack.service.BudgetsService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

/** Budgets: CRUD + per-budget utilization summary. */
@RestController
@RequestMapping("/api/v1/budgets")
public class BudgetsController {

  private final BudgetsService budgetsService;
  private final WorkspaceContext workspaceContext;

  public BudgetsController(BudgetsService budgetsService, WorkspaceContext workspaceContext) {
    this.budgetsService = budgetsService;
    this.workspaceContext = workspaceContext;
  }

  private Users currentUser(AppUserDetails details) {
    return workspaceContext.dataOwner(details);
  }

  @GetMapping
  public List<BudgetDto> list(@AuthenticationPrincipal AppUserDetails details) {
    return budgetsService.listBudgets(currentUser(details));
  }

  @GetMapping("/{id}")
  public BudgetDto get(@AuthenticationPrincipal AppUserDetails details, @PathVariable Long id) {
    return budgetsService.getBudget(currentUser(details), id);
  }

  @GetMapping("/{id}/summary")
  public BudgetSummaryDto summary(@AuthenticationPrincipal AppUserDetails details,
                                  @PathVariable Long id) {
    return budgetsService.budgetSummary(currentUser(details), id);
  }

  @PostMapping
  public ResponseEntity<BudgetDto> create(@AuthenticationPrincipal AppUserDetails details,
                                          @Valid @RequestBody BudgetCreateRequest req) {
    BudgetDto dto = budgetsService.createBudget(currentUser(details), req);
    return ResponseEntity.created(URI.create("/api/v1/budgets/" + dto.budgetId())).body(dto);
  }

  @PutMapping("/{id}")
  public BudgetDto update(@AuthenticationPrincipal AppUserDetails details, @PathVariable Long id,
                          @Valid @RequestBody BudgetUpdateRequest req) {
    return budgetsService.updateBudget(currentUser(details), id, req);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@AuthenticationPrincipal AppUserDetails details, @PathVariable Long id) {
    budgetsService.deleteBudget(currentUser(details), id);
    return ResponseEntity.noContent().build();
  }
}
