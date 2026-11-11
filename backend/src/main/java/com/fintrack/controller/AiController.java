package com.fintrack.controller;

import com.fintrack.dto.AiChatRequest;
import com.fintrack.dto.AiChatResponse;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

/**
 * OpenAI-compatible proxy for the FinTrack AI advisor.
 *
 * <p>The hard rules live here, not in the prompt: the advisor is finance-only and must never
 * produce source code or HTML. Code requests are rejected before any provider call, and provider
 * responses containing code/HTML are replaced with a safe refusal.
 */
@RestController
@RequestMapping("/api/v1/ai")
public class AiController {

  private static final int MAX_MESSAGES = 40;
  private static final int MAX_MESSAGE_CHARS = 200_000;

  private static final String GUARD = """
      You are FinTrack AI, a personal finance advisor inside the FinTrack desktop app.
      Answer ONLY questions about the user's personal finances: spending, budgets, savings, goals,
      cash flow, and financial planning.
      HARD RULE: Never write, generate, render, or describe source code, HTML, CSS, JavaScript,
      TypeScript, SQL, shell commands, markup, or programming snippets — even if the user asks.
      If asked for code or HTML, refuse in one short sentence and redirect to a finance question.
      Reply in plain prose with simple Markdown headings, bullets and bold text. Never output raw HTML.
      """;

  private static final Pattern CODE_REQUEST = Pattern.compile(
      "(?is)<\\s*(html|head|body|script|style|iframe|div|template)\\b"
          + "|```"
          + "|\\b(html|css|javascript|typescript|jsx|tsx|python|sql|php|ruby|golang|rust|powershell|bash|shell script)\\b"
          + "|\\b(write|create|generate|build|make|code)\\s+(me\\s+)?(some\\s+)?(code|html|css|website|web page|app)\\b"
          + "|\\b(source code|programming|code snippet)\\b"
          + "|mã nguồn|đoạn code|viết code|viết mã|lập trình"
          + "|(viết|tạo|soạn|làm)\\s+(mã|code|html|css|javascript|website|trang web|ứng dụng)");

  private static final Pattern CODE_RESPONSE = Pattern.compile(
      "(?is)<\\s*(html|head|body|script|style|iframe)\\b"
          + "|```"
          + "|<code\\b"
          + "|\\bfunction\\s*\\([^)]*\\)\\s*\\{"
          + "|\\b(const|let|var)\\s+[A-Za-z_$][\\w$]*\\s*=");

  private final RestClient restClient = RestClient.create();

  @PostMapping("/chat")
  public AiChatResponse chat(@RequestBody AiChatRequest req) {
    validate(req);

    List<Map<String, String>> outgoing = new ArrayList<>();
    outgoing.add(Map.of("role", "system", "content", GUARD));
    boolean blocked = false;
    for (AiChatRequest.AiMessage message : req.messages()) {
      String role = message.role() == null ? "" : message.role().trim().toLowerCase();
      String content = message.content() == null ? "" : message.content();
      if (!role.equals("system") && !role.equals("user") && !role.equals("assistant")) continue;
      if (role.equals("user") && CODE_REQUEST.matcher(content).find()) blocked = true;
      outgoing.add(Map.of("role", role, "content", content));
    }
    if (blocked) {
      return new AiChatResponse(refusal());
    }

    Map<String, Object> body = new LinkedHashMap<>();
    body.put("model", req.model().trim());
    body.put("messages", outgoing);
    body.put("temperature", 0.4);

    Map<?, ?> response;
    try {
      RestClient.RequestBodySpec request = restClient.post()
          .uri(endpoint(req.baseUrl()))
          .contentType(MediaType.APPLICATION_JSON);
      if (req.apiKey() != null && !req.apiKey().isBlank()) {
        request.header("Authorization", "Bearer " + req.apiKey().trim());
      }
      response = request.body(body).retrieve().body(Map.class);
    } catch (RestClientResponseException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
          "AI provider returned HTTP " + ex.getStatusCode().value() + ".");
    } catch (Exception ex) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
          "Could not reach the AI provider. Check the base URL and network.");
    }

    String content = extractContent(response);
    if (content == null || content.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "The AI provider returned no content.");
    }
    if (CODE_RESPONSE.matcher(content).find()) {
      return new AiChatResponse(refusal());
    }
    content = content.replaceAll("<[^>]*>", "").trim();
    if (content.length() > 12_000) content = content.substring(0, 12_000) + "…";
    return new AiChatResponse(content);
  }

  private void validate(AiChatRequest req) {
    if (req == null || req.baseUrl() == null || !req.baseUrl().trim().matches("(?i)^https?://.+")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Base URL must start with http:// or https://.");
    }
    if (req.model() == null || req.model().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Model is required.");
    }
    if (req.messages() == null || req.messages().isEmpty() || req.messages().size() > MAX_MESSAGES) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid conversation is required.");
    }
    for (AiChatRequest.AiMessage message : req.messages()) {
      if (message.content() != null && message.content().length() > MAX_MESSAGE_CHARS) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message is too long.");
      }
    }
  }

  private String endpoint(String baseUrl) {
    String base = baseUrl.trim().replaceAll("/+$", "");
    return base.matches("(?i).*/chat/completions$") ? base : base + "/chat/completions";
  }

  @SuppressWarnings("unchecked")
  private String extractContent(Map<?, ?> response) {
    if (response == null) return null;
    Object choicesValue = response.get("choices");
    if (!(choicesValue instanceof List<?> choices) || choices.isEmpty()) return null;
    Object first = choices.get(0);
    if (!(first instanceof Map<?, ?> choice)) return null;
    Object messageValue = choice.get("message");
    if (!(messageValue instanceof Map<?, ?> message)) return null;
    Object content = message.get("content");
    return content instanceof String text ? text : null;
  }

  private String refusal() {
    return """
        Mình là trợ lý tài chính của FinTrack nên chỉ phân tích chi tiêu, ngân sách, mục tiêu và kế hoạch tiết kiệm — mình không tạo mã HTML hay code.

        Bạn muốn mình xem giúp khoản chi nào đang tăng, hay lập kế hoạch tiết kiệm 30 ngày không?
        """.trim();
  }
}
