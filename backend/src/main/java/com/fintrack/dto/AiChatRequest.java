package com.fintrack.dto;

import java.util.List;

public record AiChatRequest(String baseUrl, String apiKey, String model, List<AiMessage> messages) {
  public record AiMessage(String role, String content) {}
}
