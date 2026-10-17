package com.fintrack.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** User settings: defaults per user, partial update roundtrip. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class SettingsApiTest extends ApiTestSupport {

  @Test
  void get_returnsDefaultsForNewUser() {
    String token = registerAndGetToken();

    ResponseEntity<String> res = exchange(HttpMethod.GET, "/api/v1/settings", null, token);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);

    JsonNode body = node(res.getBody());
    assertThat(body.get("theme").asText()).isEqualTo("dark");
    assertThat(body.get("displayCurrency").asText()).isEqualTo("VND");
    assertThat(body.get("locale").asText()).isEqualTo("vi-VN");
    assertThat(body.get("dateFormat").asText()).isEqualTo("dd/MM/yyyy");
    assertThat(body.get("dashboardDefaultPeriod").asText()).isEqualTo("THIS_MONTH");
  }

  @Test
  void put_updatesOnlyProvidedFields_andPersists() {
    String token = registerAndGetToken();

    Map<String, Object> patch = new HashMap<>();
    patch.put("theme", "light");
    patch.put("displayCurrency", "USD");
    ResponseEntity<String> res = exchange(HttpMethod.PUT, "/api/v1/settings", patch, token);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);

    JsonNode body = node(res.getBody());
    assertThat(body.get("theme").asText()).isEqualTo("light");
    assertThat(body.get("displayCurrency").asText()).isEqualTo("USD");
    assertThat(body.get("locale").asText()).isEqualTo("vi-VN");

    ResponseEntity<String> again = exchange(HttpMethod.GET, "/api/v1/settings", null, token);
    JsonNode persisted = node(again.getBody());
    assertThat(persisted.get("theme").asText()).isEqualTo("light");
    assertThat(persisted.get("displayCurrency").asText()).isEqualTo("USD");
  }

  @Test
  void put_emptyBody_keepsExistingValues() {
    String token = registerAndGetToken();

    ResponseEntity<String> res = exchange(HttpMethod.PUT, "/api/v1/settings", Map.of(), token);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);

    JsonNode body = node(res.getBody());
    assertThat(body.get("theme").asText()).isEqualTo("dark");
    assertThat(body.get("dashboardDefaultPeriod").asText()).isEqualTo("THIS_MONTH");
  }

  @Test
  void settings_areIsolatedPerUser() {
    String token1 = registerAndGetToken();
    String token2 = registerAndGetToken();

    exchange(HttpMethod.PUT, "/api/v1/settings", Map.of("theme", "light"), token1);

    ResponseEntity<String> res2 = exchange(HttpMethod.GET, "/api/v1/settings", null, token2);
    assertThat(node(res2.getBody()).get("theme").asText()).isEqualTo("dark");
  }

  @Test
  void settings_requireAuthentication() {
    ResponseEntity<String> res = rest.getForEntity("/api/v1/settings", String.class);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
  }
}
