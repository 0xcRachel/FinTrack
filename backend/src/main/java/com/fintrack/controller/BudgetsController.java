package com.fintrack.controller;

import com.fintrack.dto.BudgetDto;
import com.fintrack.dto.BudgetCreateRequest;
import com.fintrack.dto.BudgetUpdateRequest;
import com.fintrack.dto.BudgetSummaryDto;
import com.fintrack.security.AppUserDetails;
import com.fintrack.entity.Users;
import com.fintrack.repository.UsersRepository;
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
  private final UsersRepository usersRepository;

  public BudgetsController(BudgetsService budgetsService, UsersRepository usersRepository) {
    this.budgetsService = budgetsService;
    this.usersRepository = usersRepository;
  }

  @GetMapping
  public List<BudgetDto> list(@AuthenticationPrincipal AppUserDetails details) {
    return budgetsService.listBudgets(usersRepository.getReferenceById(details.getUserId()));
  }

  @GetMapping("/{id}")
  public BudgetDto get(@AuthenticationPrincipal AppUserDetails details, @PathVariable Long id) {
    return budgetsService.getBudget(usersRepository.getReferenceById(details.getUserId()), id);
  }

  @GetMapping("/{id}/summary")
  public BudgetSummaryDto summary(@AuthenticationPrincipal AppUserDetails details,
                                  @PathVariable Long id) {
    return budgetsService.budgetSummary(usersRepository.getReferenceById(details.getUserId()), id);
  }

  @PostMapping
  public ResponseEntity<BudgetDto> create(@AuthenticationPrincipal AppUserDetails details,
                                          @Valid @RequestBody BudgetCreateRequest req) {
    BudgetDto dto = budgetsService.createBudget(usersRepository.getReferenceById(details.getUserId()), req);
    return ResponseEntity.created(URI.create("/api/v1/budgets/" + dto.budgetId())).body(dto);
  }

  @PutMapping("/{id}")
  public BudgetDto update(@AuthenticationPrincipal AppUserDetails details, @PathVariable Long id,
                          @Valid @RequestBody BudgetUpdateRequest req) {
    return budgetsService.updateBudget(usersRepository.getReferenceById(details.getUserId()), id, req);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@AuthenticationPrincipal AppUserDetails details, @PathVariable Long id) {
    budgetsService.deleteBudget(usersRepository.getReferenceById(details.getUserId()), id);
    return ResponseEntity.noContent().build();
  }
}
