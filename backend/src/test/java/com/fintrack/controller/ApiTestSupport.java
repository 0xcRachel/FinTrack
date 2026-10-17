package com.fintrack.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/** Shared helpers for end-to-end controller tests (register + authenticated calls). */
abstract class ApiTestSupport {

  @Autowired protected TestRestTemplate rest;
  @Autowired protected ObjectMapper json;

  protected String freshEmail(String prefix) {
    return prefix + "-" + UUID.randomUUID() + "@test.local";
  }

  /** Registers a new user and returns the JWT access token. */
  protected String registerAndGetToken() {
    String mail = freshEmail("it");
    ResponseEntity<String> res = exchange(HttpMethod.POST, "/api/v1/auth/register",
        Map.of("fullName", "Integration Test", "email", mail, "password", "Secret@123"), null);
    if (!res.getStatusCode().is2xxSuccessful() || res.getBody() == null) {
      throw new IllegalStateException("Register failed: " + res.getStatusCode() + " " + res.getBody());
    }
    return node(res.getBody()).get("accessToken").asText();
  }

  protected HttpHeaders bearer(String token) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    if (token != null) {
      headers.setBearerAuth(token);
    }
    return headers;
  }

  protected ResponseEntity<String> exchange(HttpMethod method, String path, Object body, String token) {
    return rest.exchange(path, method, new HttpEntity<>(body, bearer(token)), String.class);
  }

  protected JsonNode node(String body) {
    try {
      return json.readTree(body);
    } catch (Exception e) {
      throw new IllegalStateException("Not JSON: " + body, e);
    }
  }

  protected static void assertDecimal(String actual, String expected) {
    if (actual == null) {
      throw new AssertionError("Expected decimal " + expected + " but was null");
    }
    org.assertj.core.api.Assertions.assertThat(new BigDecimal(actual))
        .isEqualByComparingTo(new BigDecimal(expected));
  }
}
