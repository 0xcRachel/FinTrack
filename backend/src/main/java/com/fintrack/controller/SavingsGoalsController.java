package com.fintrack.controller;

import com.fintrack.dto.SavingsGoalDto;
import com.fintrack.dto.SavingsGoalCreateRequest;
import com.fintrack.dto.SavingsGoalUpdateRequest;
import com.fintrack.dto.ContributionDto;
import com.fintrack.dto.ContributionCreateRequest;
import com.fintrack.dto.GoalProgressDto;
import com.fintrack.security.AppUserDetails;
import com.fintrack.entity.Users;
import com.fintrack.repository.UsersRepository;
import com.fintrack.service.SavingsGoalsService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

/** Savings goals + independent contribution ledger. */
@RestController
@RequestMapping("/api/v1/savings-goals")
public class SavingsGoalsController {

  private final SavingsGoalsService savingsGoalsService;
  private final UsersRepository usersRepository;

  public SavingsGoalsController(SavingsGoalsService savingsGoalsService,
                                UsersRepository usersRepository) {
    this.savingsGoalsService = savingsGoalsService;
    this.usersRepository = usersRepository;
  }

  @GetMapping
  public List<SavingsGoalDto> list(@AuthenticationPrincipal AppUserDetails details) {
    return savingsGoalsService.listGoals(usersRepository.getReferenceById(details.getUserId()));
  }

  @GetMapping("/{id}")
  public SavingsGoalDto get(@AuthenticationPrincipal AppUserDetails details, @PathVariable Long id) {
    return savingsGoalsService.getGoal(usersRepository.getReferenceById(details.getUserId()), id);
  }

  @GetMapping("/{id}/progress")
  public GoalProgressDto progress(@AuthenticationPrincipal AppUserDetails details,
                                  @PathVariable Long id) {
    return savingsGoalsService.goalProgress(usersRepository.getReferenceById(details.getUserId()), id);
  }

  @PostMapping
  public ResponseEntity<SavingsGoalDto> create(@AuthenticationPrincipal AppUserDetails details,
                                               @Valid @RequestBody SavingsGoalCreateRequest req) {
    SavingsGoalDto dto = savingsGoalsService.createGoal(
        usersRepository.getReferenceById(details.getUserId()), req);
    return ResponseEntity.created(URI.create("/api/v1/savings-goals/" + dto.goalId())).body(dto);
  }

  @PutMapping("/{id}")
  public SavingsGoalDto update(@AuthenticationPrincipal AppUserDetails details, @PathVariable Long id,
                               @Valid @RequestBody SavingsGoalUpdateRequest req) {
    return savingsGoalsService.updateGoal(usersRepository.getReferenceById(details.getUserId()), id, req);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> archive(@AuthenticationPrincipal AppUserDetails details,
                                      @PathVariable Long id) {
    savingsGoalsService.archiveGoal(usersRepository.getReferenceById(details.getUserId()), id);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/{id}/contributions")
  public List<ContributionDto> contributions(@AuthenticationPrincipal AppUserDetails details,
                                             @PathVariable Long id) {
    return savingsGoalsService.listContributions(usersRepository.getReferenceById(details.getUserId()), id);
  }

  @PostMapping("/{id}/contributions")
  public ResponseEntity<ContributionDto> addContribution(@AuthenticationPrincipal AppUserDetails details,
                                                         @PathVariable Long id,
                                                         @Valid @RequestBody ContributionCreateRequest req) {
    ContributionDto dto = savingsGoalsService.addContribution(
        usersRepository.getReferenceById(details.getUserId()), id, req);
    return ResponseEntity.created(URI.create("/api/v1/savings-goals/" + id + "/contributions/"
        + dto.contributionId())).body(dto);
  }
}
