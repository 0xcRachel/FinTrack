package com.fintrack.controller;

import com.fintrack.dto.TransactionDto;
import com.fintrack.dto.TransactionCreateRequest;
import com.fintrack.dto.TransactionUpdateRequest;
import com.fintrack.dto.TransactionFilter;
import com.fintrack.dto.TransactionPage;
import com.fintrack.security.AppUserDetails;
import com.fintrack.entity.Users;
import com.fintrack.repository.UsersRepository;
import com.fintrack.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

/** Transactions: full CRUD, backend filtering/pagination/sorting. Transfers are atomic. */
@RestController
@RequestMapping("/api/v1/transactions")
public class TransactionsController {

  private final TransactionService transactionService;
  private final UsersRepository usersRepository;

  public TransactionsController(TransactionService transactionService,
                                UsersRepository usersRepository) {
    this.transactionService = transactionService;
    this.usersRepository = usersRepository;
  }

  @GetMapping
  public TransactionPage list(@AuthenticationPrincipal AppUserDetails details,
                              TransactionFilter filter) {
    return transactionService.listTransactions(usersRepository.getReferenceById(details.getUserId()), filter);
  }

  @GetMapping("/{id}")
  public TransactionDto get(@AuthenticationPrincipal AppUserDetails details, @PathVariable Long id) {
    return transactionService.getTransaction(usersRepository.getReferenceById(details.getUserId()), id);
  }

  @PostMapping
  public ResponseEntity<TransactionDto> create(@AuthenticationPrincipal AppUserDetails details,
                                               @Valid @RequestBody TransactionCreateRequest req) {
    TransactionDto dto = transactionService.createTransaction(
        usersRepository.getReferenceById(details.getUserId()), req);
    return ResponseEntity.created(URI.create("/api/v1/transactions/" + dto.transactionId())).body(dto);
  }

  @PutMapping("/{id}")
  public TransactionDto update(@AuthenticationPrincipal AppUserDetails details, @PathVariable Long id,
                               @Valid @RequestBody TransactionUpdateRequest req) {
    return transactionService.updateTransaction(usersRepository.getReferenceById(details.getUserId()), id, req);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@AuthenticationPrincipal AppUserDetails details, @PathVariable Long id) {
    transactionService.deleteTransaction(usersRepository.getReferenceById(details.getUserId()), id);
    return ResponseEntity.noContent().build();
  }
}
