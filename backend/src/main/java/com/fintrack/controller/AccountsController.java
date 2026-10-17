package com.fintrack.controller;

import com.fintrack.dto.AccountDto;
import com.fintrack.dto.AccountCreateRequest;
import com.fintrack.dto.AccountUpdateRequest;
import com.fintrack.dto.AccountArchiveRequest;
import com.fintrack.dto.AccountBalanceDto;
import com.fintrack.security.AppUserDetails;
import com.fintrack.entity.Users;
import com.fintrack.repository.UsersRepository;
import com.fintrack.service.AccountsService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

/** Accounts: CRUD + archive + balance view. All operations scoped to the authenticated user. */
@RestController
@RequestMapping("/api/v1/accounts")
public class AccountsController {

  private final AccountsService accountsService;
  private final UsersRepository usersRepository;

  public AccountsController(AccountsService accountsService, UsersRepository usersRepository) {
    this.accountsService = accountsService;
    this.usersRepository = usersRepository;
  }

  private Users currentUser(AppUserDetails details) {
    return usersRepository.getReferenceById(details.getUserId());
  }

  @GetMapping
  public Page<AccountDto> list(@AuthenticationPrincipal AppUserDetails details,
                               @PageableDefault(size = 25, sort = "name") Pageable pageable) {
    return accountsService.listAccounts(currentUser(details), pageable);
  }

  @GetMapping("/balances")
  public java.util.List<AccountBalanceDto> balances(@AuthenticationPrincipal AppUserDetails details) {
    return accountsService.accountBalances(currentUser(details));
  }

  @GetMapping("/{id}")
  public AccountDto get(@AuthenticationPrincipal AppUserDetails details, @PathVariable Long id) {
    return accountsService.getAccount(currentUser(details), id);
  }

  @PostMapping
  public ResponseEntity<AccountDto> create(@AuthenticationPrincipal AppUserDetails details,
                                           @Valid @RequestBody AccountCreateRequest req) {
    AccountDto dto = accountsService.createAccount(currentUser(details), req);
    return ResponseEntity.created(URI.create("/api/v1/accounts/" + dto.accountId())).body(dto);
  }

  @PutMapping("/{id}")
  public AccountDto update(@AuthenticationPrincipal AppUserDetails details, @PathVariable Long id,
                           @Valid @RequestBody AccountUpdateRequest req) {
    return accountsService.updateAccount(currentUser(details), id, req);
  }

  @PatchMapping("/{id}/archive")
  public ResponseEntity<Void> archive(@AuthenticationPrincipal AppUserDetails details,
                                      @PathVariable Long id,
                                      @RequestBody AccountArchiveRequest req) {
    accountsService.archiveAccount(currentUser(details), id, req);
    return ResponseEntity.noContent().build();
  }
}
