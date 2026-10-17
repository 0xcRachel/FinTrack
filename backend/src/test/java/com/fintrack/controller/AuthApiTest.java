package com.fintrack.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;

/** End-to-end auth flow: register, login, token-protected access. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AuthApiTest {

  @Autowired private TestRestTemplate rest;
  @Autowired private ObjectMapper json;

  private String email() {
    return "auth-" + UUID.randomUUID() + "@test.local";
  }

  private ResponseEntity<String> post(String path, Map<String, Object> body) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    return rest.exchange(path, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
  }

  private JsonNode node(String body) throws Exception {
    return json.readTree(body);
  }

  @Test
  void register_createsUserAndReturnsToken() throws Exception {
    String mail = email();
    ResponseEntity<String> res = post("/api/v1/auth/register",
        Map.of("fullName", "Nguyen Van Test", "email", mail, "password", "Secret@123"));

    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    JsonNode body = node(res.getBody());
    assertThat(body.get("accessToken").asText()).isNotBlank();
    assertThat(body.get("email").asText()).isEqualTo(mail);
    assertThat(body.get("userId").asLong()).isPositive();
  }

  @Test
  void register_duplicateEmail_returns409() throws Exception {
    String mail = email();
    post("/api/v1/auth/register",
        Map.of("fullName", "Dup One", "email", mail, "password", "Secret@123"));
    ResponseEntity<String> res = post("/api/v1/auth/register",
        Map.of("fullName", "Dup Two", "email", mail, "password", "Secret@123"));

    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    assertThat(node(res.getBody()).get("status").asInt()).isEqualTo(409);
  }

  @Test
  void register_invalidPayload_returns400() throws Exception {
    ResponseEntity<String> badEmail = post("/api/v1/auth/register",
        Map.of("fullName", "A", "email", "not-an-email", "password", "Secret@123"));
    assertThat(badEmail.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

    ResponseEntity<String> shortPassword = post("/api/v1/auth/register",
        Map.of("fullName", "A", "email", email(), "password", "short"));
    assertThat(shortPassword.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

    ResponseEntity<String> noName = post("/api/v1/auth/register",
        Map.of("email", email(), "password", "Secret@123"));
    assertThat(noName.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
  }

  @Test
  void login_correctCredentials_returns200WithToken() throws Exception {
    String mail = email();
    post("/api/v1/auth/register",
        Map.of("fullName", "Login Test", "email", mail, "password", "Secret@123"));

    ResponseEntity<String> res = post("/api/v1/auth/login",
        Map.of("email", mail, "password", "Secret@123"));

    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(node(res.getBody()).get("accessToken").asText()).isNotBlank();
  }

  @Test
  void login_wrongPassword_returns401() throws Exception {
    String mail = email();
    post("/api/v1/auth/register",
        Map.of("fullName", "Login Test", "email", mail, "password", "Secret@123"));

    ResponseEntity<String> res = post("/api/v1/auth/login",
        Map.of("email", mail, "password", "WrongPass@1"));

    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
  }

  @Test
  void login_unknownEmail_returns401() {
    ResponseEntity<String> res = post("/api/v1/auth/login",
        Map.of("email", email(), "password", "Secret@123"));

    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
  }

  @Test
  void protectedEndpoint_withoutToken_returns401() {
    ResponseEntity<String> res = rest.getForEntity("/api/v1/accounts", String.class);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
  }

  @Test
  void protectedEndpoint_withGarbageToken_returns401() {
    HttpHeaders headers = new HttpHeaders();
    headers.setBearerAuth("garbage.token.value");
    ResponseEntity<String> res = rest.exchange("/api/v1/accounts", HttpMethod.GET,
        new HttpEntity<>(headers), String.class);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
  }

  @Test
  void protectedEndpoint_withValidToken_returns200() throws Exception {
    ResponseEntity<String> reg = post("/api/v1/auth/register",
        Map.of("fullName", "Token Test", "email", email(), "password", "Secret@123"));
    String token = node(reg.getBody()).get("accessToken").asText();

    HttpHeaders headers = new HttpHeaders();
    headers.setBearerAuth(token);
    ResponseEntity<String> res = rest.exchange("/api/v1/accounts", HttpMethod.GET,
        new HttpEntity<>(headers), String.class);

    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
  }
}
