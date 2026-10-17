package com.fintrack.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** Reports: monthly trends, category distribution, budget performance, balances, CSV export. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ReportsApiTest extends ApiTestSupport {

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

  private record Seed(String token, long accountA, long accountB, long incCat, long expCat) {}

  private Seed seed() {
    String token = registerAndGetToken();
    long a = createAccount(token, "Rep A", "1000000");
    long b = createAccount(token, "Rep B", "0");
    long incCat = createCategory(token, "Rep Salary " + System.nanoTime(), "INCOME");
    long expCat = createCategory(token, "Rep Groceries " + System.nanoTime(), "EXPENSE");

    createTransaction(token, Map.of("transactionType", "INCOME", "amount", "300000",
        "currencyCode", "VND", "categoryId", incCat, "destinationAccountId", a,
        "transactionDate", "2026-10-05"));
    createTransaction(token, Map.of("transactionType", "EXPENSE", "amount", "120000",
        "currencyCode", "VND", "categoryId", expCat, "sourceAccountId", a,
        "transactionDate", "2026-10-06"));
    createTransaction(token, Map.of("transactionType", "TRANSFER", "amount", "50000",
        "currencyCode", "VND", "sourceAccountId", a, "destinationAccountId", b,
        "transactionDate", "2026-10-07"));
    return new Seed(token, a, b, incCat, expCat);
  }

  @Test
  void incomeExpenses_returnsMonthlyTotals() {
    Seed s = seed();

    ResponseEntity<String> res = exchange(HttpMethod.GET,
        "/api/v1/reports/income-expenses?startDate=2026-10-01&endDate=2026-12-31", null, s.token());
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);

    JsonNode october = null;
    for (JsonNode point : node(res.getBody())) {
      if (point.get("month").asText().startsWith("2026-10")) {
        october = point;
      }
    }
    assertThat(october).isNotNull();
    assertThat(october.get("income").decimalValue()).isEqualByComparingTo(new BigDecimal("300000"));
    assertThat(october.get("expense").decimalValue()).isEqualByComparingTo(new BigDecimal("120000"));
    assertThat(october.get("net").decimalValue()).isEqualByComparingTo(new BigDecimal("180000"));
  }

  @Test
  void categoryBreakdown_listsIncomeAndExpenseGroups() {
    Seed s = seed();

    ResponseEntity<String> res = exchange(HttpMethod.GET,
        "/api/v1/reports/category-breakdown?startDate=2026-10-01&endDate=2026-10-31", null, s.token());
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);

    JsonNode entries = node(res.getBody());
    JsonNode income = null;
    JsonNode expense = null;
    for (JsonNode e : entries) {
      if (e.get("categoryName").asText().startsWith("Rep Salary")) {
        income = e;
      }
      if (e.get("categoryName").asText().startsWith("Rep Groceries")) {
        expense = e;
      }
    }
    assertThat(income).isNotNull();
    assertThat(expense).isNotNull();
    assertThat(income.get("type").asText()).isEqualTo("INCOME");
    assertThat(expense.get("type").asText()).isEqualTo("EXPENSE");
    assertThat(income.get("amount").decimalValue()).isEqualByComparingTo(new BigDecimal("300000"));
    assertThat(expense.get("amount").decimalValue()).isEqualByComparingTo(new BigDecimal("120000"));
  }

  @Test
  void budgetPerformance_reportsSpendingAndUtilization() {
    Seed s = seed();

    ResponseEntity<String> budget = exchange(HttpMethod.POST, "/api/v1/budgets",
        Map.of("name", "October Budget", "categoryId", s.expCat(), "amount", 200000,
            "currencyCode", "VND", "periodType", "MONTHLY",
            "startDate", "2026-10-01", "endDate", "2026-10-31",
            "warningThresholdPercent", 80), s.token());
    assertThat(budget.getStatusCode()).isEqualTo(HttpStatus.CREATED);

    ResponseEntity<String> res = exchange(HttpMethod.GET,
        "/api/v1/reports/budget-performance?startDate=2026-10-01&endDate=2026-10-31", null, s.token());
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);

    JsonNode rows = node(res.getBody());
    assertThat(rows).hasSize(1);
    JsonNode row = rows.get(0);
    assertThat(row.get("name").asText()).isEqualTo("October Budget");
    assertDecimal(row.get("actualSpending").asText(), "120000");
    assertThat(row.get("utilizationPercent").decimalValue())
        .isEqualByComparingTo(new BigDecimal("60"));
  }

  @Test
  void accountBalances_returnsDerivedBalances() {
    Seed s = seed();

    ResponseEntity<String> res = exchange(HttpMethod.GET, "/api/v1/reports/account-balances", null, s.token());
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);

    JsonNode rows = node(res.getBody());
    JsonNode a = null;
    JsonNode b = null;
    for (JsonNode row : rows) {
      if ("Rep A".equals(row.get("name").asText())) a = row;
      if ("Rep B".equals(row.get("name").asText())) b = row;
    }
    assertThat(a).isNotNull();
    assertThat(b).isNotNull();
    assertThat(a.get("balance").decimalValue()).isEqualByComparingTo(new BigDecimal("1130000"));
    assertThat(b.get("balance").decimalValue()).isEqualByComparingTo(new BigDecimal("50000"));
  }

  @Test
  void csvExport_escapesFormulasAndExportsAllRowsBeyondOnePage() {
    Seed s = seed();

    createTransaction(s.token(), Map.of("transactionType", "EXPENSE", "amount", "1000",
        "currencyCode", "VND", "categoryId", s.expCat(), "sourceAccountId", s.accountA(),
        "transactionDate", "2026-10-10", "description", "=SUM(A1)"));
    createTransaction(s.token(), Map.of("transactionType", "EXPENSE", "amount", "2000",
        "currencyCode", "VND", "categoryId", s.expCat(), "sourceAccountId", s.accountA(),
        "transactionDate", "2026-10-11", "description", "Lunch, coffee"));
    createTransaction(s.token(), Map.of("transactionType", "EXPENSE", "amount", "3000",
        "currencyCode", "VND", "categoryId", s.expCat(), "sourceAccountId", s.accountA(),
        "transactionDate", "2026-10-12", "description", "say \"hi\""));

    int bulk = 103;
    for (int i = 0; i < bulk; i++) {
      createTransaction(s.token(), Map.of("transactionType", "EXPENSE", "amount", "1",
          "currencyCode", "VND", "categoryId", s.expCat(), "sourceAccountId", s.accountA(),
          "transactionDate", "2026-10-15", "description", "bulk " + i));
    }

    ResponseEntity<String> res = exchange(HttpMethod.GET, "/api/v1/reports/transactions/export",
        null, s.token());
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
    String body = res.getBody();
    assertThat(body).isNotNull();

    // UTF-8 BOM for Excel
    assertThat(body).startsWith("\uFEFF");
    // header present
    assertThat(body).contains("TransactionId,TransactionDate,Type,Amount");
    // formula injection guarded with a leading tab
    assertThat(body).contains("\t=SUM(A1)");
    // comma and quote escaping
    assertThat(body).contains("\"Lunch, coffee\"");
    assertThat(body).contains("\"say \"\"hi\"\"\"");
    // all rows across pages: header + 3 seed + 3 special + bulk
    long dataRows = java.util.Arrays.stream(body.split("\\r?\\n"))
        .filter(line -> !line.isBlank()).count() - 1;
    assertThat(dataRows).isEqualTo(3 + 3 + bulk);
  }

  @Test
  void reports_requireAuthentication() {
    ResponseEntity<String> res = rest.getForEntity(
        "/api/v1/reports/income-expenses?startDate=2026-10-01&endDate=2026-10-31", String.class);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
  }
}
