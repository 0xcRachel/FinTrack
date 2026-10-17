package com.fintrack.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** Dashboard endpoints computed from persisted, per-user data. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class DashboardApiTest extends ApiTestSupport {

  private static final String START = "2026-10-01";
  private static final String END = "2026-10-31";

  private long createAccount(String token, String name, String opening) {
    ResponseEntity<String> res = exchange(HttpMethod.POST, "/api/v1/accounts",
        Map.of("name", name, "accountType", "CASH", "currencyCode", "VND",
            "openingBalance", opening), token);
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

  /** Seeds one user with deterministic October-2026 data and returns the token. */
  private String seedUser() {
    String token = registerAndGetToken();
    long a = createAccount(token, "Dash A", "1000000");
    long b = createAccount(token, "Dash B", "0");
    long incCat = createCategory(token, "Dash Salary " + System.nanoTime(), "INCOME");
    long expCat = createCategory(token, "Dash Groceries " + System.nanoTime(), "EXPENSE");

    createTransaction(token, Map.of("transactionType", "INCOME", "amount", "300000",
        "currencyCode", "VND", "categoryId", incCat, "destinationAccountId", a,
        "transactionDate", "2026-10-05", "description", "October salary"));
    createTransaction(token, Map.of("transactionType", "EXPENSE", "amount", "120000",
        "currencyCode", "VND", "categoryId", expCat, "sourceAccountId", a,
        "transactionDate", "2026-10-06", "description", "Groceries run"));
    createTransaction(token, Map.of("transactionType", "TRANSFER", "amount", "50000",
        "currencyCode", "VND", "sourceAccountId", a, "destinationAccountId", b,
        "transactionDate", "2026-10-07", "description", "Top up wallet"));
    return token;
  }

  @Test
  void summary_returnsIncomeExpenseNetAndTotalBalance() {
    String token = seedUser();

    ResponseEntity<String> res = exchange(HttpMethod.GET,
        "/api/v1/dashboard/summary?startDate=" + START + "&endDate=" + END, null, token);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
    JsonNode body = node(res.getBody());

    assertDecimal(body.get("totalIncome").asText(), "300000");
    assertDecimal(body.get("totalExpense").asText(), "120000");
    assertDecimal(body.get("netCashFlow").asText(), "180000");
    // A = 1000000 + 300000 − 120000 − 50000 = 1130000 ; B = 50000 ; total = 1180000
    assertDecimal(body.get("totalBalance").asText(), "1180000");
  }

  @Test
  void cashFlow_returnsDailyPoints() {
    String token = seedUser();

    ResponseEntity<String> res = exchange(HttpMethod.GET,
        "/api/v1/dashboard/cash-flow?startDate=" + START + "&endDate=" + END, null, token);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);

    JsonNode points = node(res.getBody()).get("points");
    JsonNode incomeDay = null;
    for (JsonNode p : points) {
      if ("2026-10-05".equals(p.get("date").asText())) {
        incomeDay = p;
      }
    }
    assertThat(incomeDay).isNotNull();
    assertDecimal(incomeDay.get("income").asText(), "300000");
    assertDecimal(incomeDay.get("expense").asText(), "0");
  }

  @Test
  void expenseBreakdown_groupsByCategoryWithPercentage() {
    String token = seedUser();

    ResponseEntity<String> res = exchange(HttpMethod.GET,
        "/api/v1/dashboard/expense-breakdown?startDate=" + START + "&endDate=" + END, null, token);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
    JsonNode body = node(res.getBody());

    assertDecimal(body.get("totalExpense").asText(), "120000");
    JsonNode categories = body.get("categories");
    assertThat(categories).hasSize(1);
    JsonNode entry = categories.get(0);
    assertThat(entry.get("categoryName").asText()).startsWith("Dash Groceries");
    assertDecimal(entry.get("amount").asText(), "120000");
    assertThat(entry.get("percentOfExpense").decimalValue())
        .isEqualByComparingTo(new java.math.BigDecimal("100"));
  }

  @Test
  void recentTransactions_respectsLimitAndOrdersNewestFirst() {
    String token = seedUser();

    ResponseEntity<String> res = exchange(HttpMethod.GET,
        "/api/v1/dashboard/recent-transactions?limit=2", null, token);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
    JsonNode items = node(res.getBody()).get("items");

    assertThat(items).hasSize(2);
    assertThat(items.get(0).get("transactionDate").asText()).isEqualTo("2026-10-07");
    assertThat(items.get(0).get("type").asText()).isEqualTo("TRANSFER");
    assertThat(items.get(0).get("accountName").asText()).isNotBlank();
  }

  @Test
  void dashboard_requiresAuthentication() {
    ResponseEntity<String> res = rest.getForEntity(
        "/api/v1/dashboard/summary?startDate=" + START + "&endDate=" + END, String.class);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
  }

  @Test
  void summary_missingDateParam_returns400() {
    String token = registerAndGetToken();
    ResponseEntity<String> res = exchange(HttpMethod.GET, "/api/v1/dashboard/summary", null, token);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
  }
}
