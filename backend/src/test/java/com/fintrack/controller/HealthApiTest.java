package com.fintrack.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.fintrack.dto.HealthDto.DatabaseHealth;
import com.fintrack.dto.HealthDto.Health;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * Phase-1 smoke tests. Require the local MySQL (Laragon) with scripts
 * 01–04 applied — they prove app ↔ database wiring, not business rules.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class HealthApiTest {

  @Autowired private TestRestTemplate rest;

  @Test
  void healthIsUp() {
    ResponseEntity<Health> res = rest.getForEntity("/api/v1/health", Health.class);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(res.getBody()).isNotNull();
    assertThat(res.getBody().status()).isEqualTo("UP");
  }

  @Test
  void databaseIsUp() {
    ResponseEntity<DatabaseHealth> res =
        rest.getForEntity("/api/v1/health/database", DatabaseHealth.class);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(res.getBody()).isNotNull();
    assertThat(res.getBody().status()).isEqualTo("UP");
    assertThat(res.getBody().product()).isNotBlank();
  }
}
