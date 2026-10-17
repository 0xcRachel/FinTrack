package com.fintrack.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * Account CRUD + the derived-balance regression suite.
 *
 * Balance formula under test:
 *   opening + income received − expenses paid + transfers in − transfers out
 * Each figure must be scoped to the account (income by destination, expense by source).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AccountsApiTest extends ApiTestSupport {

  private long createAccount(String token, String name, String opening) {
    ResponseEntity<String> res = exchange(HttpMethod.POST, "/api/v1/accounts",
        Map.of("name", name, "accountType", "CASH", "currencyCode", "VND",
            "openingBalance", opening, "description", "test"), token);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    return node(res.getBody()).get("accountId").asLong();
  }

  private long createCategory(String token, String name, String type) {
    ResponseEntity<String> res = exchange(HttpMethod.POST, "/api/v1/categories",
        Map.of("name", name, "categoryType", type), token);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    return node(res.getBody()).get("categoryId").asLong();
  }

  private void createTransaction(String token, Map<String, Object> body) {
    ResponseEntity<String> res = exchange(HttpMethod.POST, "/api/v1/transactions", body, token);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
  }

  private JsonNode balancesByName(String token) {
    ResponseEntity<String> res = exchange(HttpMethod.GET, "/api/v1/accounts/balances", null, token);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
    return node(res.getBody());
  }

  private JsonNode findBalance(JsonNode array, String name) {
    for (JsonNode item : array) {
      if (name.equals(item.get("name").asText())) {
        return item;
      }
    }
    throw new AssertionError("No balance entry for account " + name);
  }

  @Test
  void derivedBalances_scopeIncomeExpenseAndTransfersPerAccount() {
    String token = registerAndGetToken();
    long a = createAccount(token, "Account A", "100000");
    long b = createAccount(token, "Account B", "200000");
    long incCat = createCategory(token, "Salary " + System.nanoTime(), "INCOME");
    long expCat = createCategory(token, "Groceries " + System.nanoTime(), "EXPENSE");

    createTransaction(token, Map.of("transactionType", "INCOME", "amount", "50000",
        "currencyCode", "VND", "categoryId", incCat, "destinationAccountId", a,
        "transactionDate", "2026-10-05"));
    createTransaction(token, Map.of("transactionType", "EXPENSE", "amount", "30000",
        "currencyCode", "VND", "categoryId", expCat, "sourceAccountId", a,
        "transactionDate", "2026-10-06"));
    createTransaction(token, Map.of("transactionType", "TRANSFER", "amount", "20000",
        "currencyCode", "VND", "sourceAccountId", a, "destinationAccountId", b,
        "transactionDate", "2026-10-07"));
    createTransaction(token, Map.of("transactionType", "INCOME", "amount", "10000",
        "currencyCode", "VND", "categoryId", incCat, "destinationAccountId", b,
        "transactionDate", "2026-10-08"));
    createTransaction(token, Map.of("transactionType", "EXPENSE", "amount", "5000",
        "currencyCode", "VND", "categoryId", expCat, "sourceAccountId", b,
        "transactionDate", "2026-10-09"));

    JsonNode balances = balancesByName(token);
    // A = 100000 + 50000 − 30000 − 20000 (transfer out)
    assertDecimal(findBalance(balances, "Account A").get("currentBalance").asText(), "100000");
    // B = 200000 + 10000 − 5000 + 20000 (transfer in)
    assertDecimal(findBalance(balances, "Account B").get("currentBalance").asText(), "225000");
  }

  @Test
  void listAccounts_isPagedAndCarriesCurrentBalance() {
    String token = registerAndGetToken();
    createAccount(token, "Paged Account", "75000");

    ResponseEntity<String> res = exchange(HttpMethod.GET, "/api/v1/accounts", null, token);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
    JsonNode page = node(res.getBody());
    assertThat(page.has("content")).isTrue();

    JsonNode found = null;
    for (JsonNode item : page.get("content")) {
      if ("Paged Account".equals(item.get("name").asText())) {
        found = item;
      }
    }
    assertThat(found).isNotNull();
    assertDecimal(found.get("currentBalance").asText(), "75000");
  }

  @Test
  void createAccount_duplicateName_returns400() {
    String token = registerAndGetToken();
    createAccount(token, "Unique Name", "1000");

    ResponseEntity<String> res = exchange(HttpMethod.POST, "/api/v1/accounts",
        Map.of("name", "Unique Name", "accountType", "BANK", "currencyCode", "VND",
            "openingBalance", "0"), token);

    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createAccount_invalidCurrency_returns400() {
    String token = registerAndGetToken();
    ResponseEntity<String> res = exchange(HttpMethod.POST, "/api/v1/accounts",
        Map.of("name", "Bad Currency", "accountType", "CASH", "currencyCode", "vnd",
            "openingBalance", "0"), token);

    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
  }

  @Test
  void archiveAccount_hidesItFromListAndBalances() {
    String token = registerAndGetToken();
    long id = createAccount(token, "To Archive", "5000");

    ResponseEntity<String> patch = exchange(HttpMethod.PATCH,
        "/api/v1/accounts/" + id + "/archive", Map.of("isArchived", true), token);
    assertThat(patch.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

    ResponseEntity<String> list = exchange(HttpMethod.GET, "/api/v1/accounts", null, token);
    for (JsonNode item : node(list.getBody()).get("content")) {
      assertThat(item.get("name").asText()).isNotEqualTo("To Archive");
    }

    JsonNode balances = balancesByName(token);
    for (JsonNode item : balances) {
      assertThat(item.get("name").asText()).isNotEqualTo("To Archive");
    }
  }

  @Test
  void updateAccount_renamesAndReturnsBalance() {
    String token = registerAndGetToken();
    long id = createAccount(token, "Old Name", "4200");

    ResponseEntity<String> res = exchange(HttpMethod.PUT, "/api/v1/accounts/" + id,
        Map.of("name", "New Name"), token);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
    JsonNode body = node(res.getBody());
    assertThat(body.get("name").asText()).isEqualTo("New Name");
    assertDecimal(body.get("currentBalance").asText(), "4200");
  }

  @Test
  void accountsOfOtherUser_areNotVisible() {
    String token1 = registerAndGetToken();
    String token2 = registerAndGetToken();
    long id = createAccount(token1, "Private Account", "1000");

    ResponseEntity<String> res = exchange(HttpMethod.GET, "/api/v1/accounts/" + id, null, token2);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

    ResponseEntity<String> list2 = exchange(HttpMethod.GET, "/api/v1/accounts", null, token2);
    assertThat(node(list2.getBody()).get("content")).isEmpty();
  }
}
