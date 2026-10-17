package com.fintrack.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fintrack.dto.AccountCreateRequest;
import com.fintrack.dto.AccountUpdateRequest;
import com.fintrack.dto.AccountArchiveRequest;
import com.fintrack.entity.Accounts;
import com.fintrack.entity.Users;
import com.fintrack.enums.AccountType;
import com.fintrack.repository.AccountsRepository;
import com.fintrack.repository.TransactionsRepository;
import com.fintrack.repository.UsersRepository;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

@DataJpaTest
@Transactional
class AccountsServiceTest {

  @Autowired AccountsRepository accountsRepository;
  @Autowired TransactionsRepository transactionsRepository;
  @Autowired UsersRepository usersRepository;

  AccountsService service;
  Users user;

  @BeforeEach
  void setUp() {
    service = new AccountsService(accountsRepository, transactionsRepository);
    user = usersRepository.save(new Users("Nguyễn Văn A", "a@example.com", "hash"));
  }

  @Test
  void createAndDeriveBalance() {
    var a = service.createAccount(user,
        new AccountCreateRequest("Tiền mặt", AccountType.CASH, "VND",
            new BigDecimal("5000000.0000"), "ví"));
    assertThat(a.accountId()).isNotNull();
    assertThat(a.openingBalance()).isEqualByComparingTo("5000000.0000");

    var fetched = service.getAccount(user, a.accountId());
    assertThat(fetched.currentBalance()).isEqualByComparingTo("5000000.0000");
    assertThat(fetched.isArchived()).isFalse();
  }

  @Test
  void duplicateNameRejected() {
    service.createAccount(user, new AccountCreateRequest("Tiền mặt", AccountType.CASH, "VND",
        BigDecimal.ZERO, null));
    assertThatThrownBy(() -> service.createAccount(user,
        new AccountCreateRequest("Tiền mặt", AccountType.CASH, "VND",
            BigDecimal.ZERO, null)))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("already exists");
  }

  @Test
  void negativeOpeningRejected() {
    assertThatThrownBy(() -> service.createAccount(user,
        new AccountCreateRequest("Am", AccountType.CASH, "VND",
            new BigDecimal("-100"), null)))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void invalidCurrencyRejected() {
    assertThatThrownBy(() -> service.createAccount(user,
        new AccountCreateRequest("X", AccountType.CASH, "vietnamese dong",
            BigDecimal.ZERO, null)))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void archiveAndExcludeFromList() {
    var a = service.createAccount(user, new AccountCreateRequest("Archived",
        AccountType.CASH, "VND", BigDecimal.ZERO, null));
    service.archiveAccount(user, a.accountId(), new AccountArchiveRequest(true));

    var page = service.listAccounts(user, Pageable.unpaged());
    assertThat(page.getContent()).extracting(com.fintrack.dto.AccountDto::name)
        .doesNotContain("Archived");
  }

  @Test
  void notFound() {
    assertThatThrownBy(() -> service.getAccount(user, 999L))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void balancesList() {
    service.createAccount(user, new AccountCreateRequest("A", AccountType.CASH, "VND",
        new BigDecimal("1000"), null));
    service.createAccount(user, new AccountCreateRequest("B", AccountType.CASH, "USD",
        new BigDecimal("500"), null));
    List<com.fintrack.dto.AccountBalanceDto> bal = service.accountBalances(user);
    assertThat(bal).extracting(com.fintrack.dto.AccountBalanceDto::name)
        .containsExactlyInAnyOrder("A", "B");
  }
}
