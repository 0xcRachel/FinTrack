package com.fintrack.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** Personal + family spaces: creation, isolation between spaces, and shared family access. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class WorkspacesApiTest extends ApiTestSupport {

  private record Session(String token, String email) {}

  private Session register(String label) {
    String email = freshEmail(label.toLowerCase());
    ResponseEntity<String> res = exchange(HttpMethod.POST, "/api/v1/auth/register",
        Map.of("fullName", "Space " + label, "email", email, "password", "Secret@123"), null);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    return new Session(node(res.getBody()).get("accessToken").asText(), email);
  }

  private JsonNode listWorkspaces(String token) {
    ResponseEntity<String> res = exchange(HttpMethod.GET, "/api/v1/workspaces", null, token);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
    return node(res.getBody());
  }

  private long familySpace(Session owner, String name) {
    ResponseEntity<String> res = exchange(HttpMethod.POST, "/api/v1/workspaces",
        Map.of("name", name, "type", "FAMILY"), owner.token());
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    return node(res.getBody()).get("workspaceId").asLong();
  }

  private ResponseEntity<String> createAccount(Session session, Long workspaceId, String name) {
    return exchange(HttpMethod.POST, "/api/v1/accounts",
        Map.of("name", name, "accountType", "CASH", "currencyCode", "VND",
            "openingBalance", "1000", "description", "spaces test"),
        session.token(), workspaceId);
  }

  private JsonNode accounts(Session session, Long workspaceId) {
    ResponseEntity<String> res = exchange(HttpMethod.GET, "/api/v1/accounts?size=100", null,
        session.token(), workspaceId);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
    return node(res.getBody()).get("content");
  }

  private boolean hasAccount(JsonNode page, String name) {
    for (JsonNode item : page) {
      if (name.equals(item.get("name").asText())) return true;
    }
    return false;
  }

  @Test
  void everyAccountStartsWithAPersonalSpaceAndCanCreateAFamilySpace() {
    Session user = register("Owner");

    JsonNode spaces = listWorkspaces(user.token());
    assertThat(spaces.size()).isEqualTo(1);
    assertThat(spaces.get(0).get("type").asText()).isEqualTo("PERSONAL");
    assertThat(spaces.get(0).get("isDefault").asBoolean()).isTrue();
    assertThat(spaces.get(0).get("role").asText()).isEqualTo("OWNER");
    assertThat(spaces.get(0).get("memberCount").asLong()).isEqualTo(1);

    long family = familySpace(user, "Family budget");
    JsonNode after = listWorkspaces(user.token());
    assertThat(after.size()).isEqualTo(2);

    assertThat(createAccount(user, family, "Family wallet").getStatusCode())
        .isEqualTo(HttpStatus.CREATED);
    assertThat(hasAccount(accounts(user, family), "Family wallet")).isTrue();
    assertThat(hasAccount(accounts(user, null), "Family wallet")).isFalse();

    assertThat(createAccount(user, null, "Personal wallet").getStatusCode())
        .isEqualTo(HttpStatus.CREATED);
    assertThat(hasAccount(accounts(user, null), "Personal wallet")).isTrue();
    assertThat(hasAccount(accounts(user, family), "Personal wallet")).isFalse();
  }

  @Test
  void familyMembersShareTheSpaceAndOnlyTheOwnerManagesMembers() {
    Session owner = register("Owner");
    Session member = register("Member");
    long family = familySpace(owner, "Our home");

    ResponseEntity<String> added = exchange(HttpMethod.POST,
        "/api/v1/workspaces/" + family + "/members", Map.of("email", member.email()),
        owner.token());
    assertThat(added.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    long memberId = node(added.getBody()).get("memberId").asLong();

    boolean memberSeesSpace = false;
    for (JsonNode space : listWorkspaces(member.token())) {
      if (space.get("workspaceId").asLong() == family) memberSeesSpace = true;
    }
    assertThat(memberSeesSpace).isTrue();

    assertThat(createAccount(member, family, "Shared wallet").getStatusCode())
        .isEqualTo(HttpStatus.CREATED);
    assertThat(hasAccount(accounts(owner, family), "Shared wallet")).isTrue();
    assertThat(hasAccount(accounts(member, null), "Shared wallet")).isFalse();

    ResponseEntity<String> memberCannotInvite = exchange(HttpMethod.POST,
        "/api/v1/workspaces/" + family + "/members", Map.of("email", owner.email()),
        member.token());
    assertThat(memberCannotInvite.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

    ResponseEntity<String> removed = exchange(HttpMethod.DELETE,
        "/api/v1/workspaces/" + family + "/members/" + memberId, null, owner.token());
    assertThat(removed.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

    ResponseEntity<String> afterRemoval = exchange(HttpMethod.GET, "/api/v1/accounts",
        null, member.token(), family);
    assertThat(afterRemoval.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
  }

  @Test
  void unknownWorkspaceHeaderIsRejected() {
    Session user = register("Outsider");
    ResponseEntity<String> res = exchange(HttpMethod.GET, "/api/v1/accounts",
        null, user.token(), 999_999L);
    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

    ResponseEntity<String> badHeader = rest.exchange("/api/v1/accounts", HttpMethod.GET,
        new org.springframework.http.HttpEntity<>(null, withHeader(user.token(), "not-a-number")),
        String.class);
    assertThat(badHeader.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
  }

  private org.springframework.http.HttpHeaders withHeader(String token, String value) {
    org.springframework.http.HttpHeaders headers = bearer(token);
    headers.set("X-Workspace-Id", value);
    return headers;
  }
}
