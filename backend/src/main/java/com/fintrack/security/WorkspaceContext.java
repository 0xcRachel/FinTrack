package com.fintrack.security;

import com.fintrack.entity.Users;
import com.fintrack.service.WorkspaceService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.RequestScope;

/**
 * Resolves X-Workspace-Id once per request into the data-owner user used by financial
 * services. Falling back to the personal space keeps header-less calls (and old clients)
 * working, while an unknown or foreign workspace id is rejected.
 */
@Component
@RequestScope
public class WorkspaceContext {

  public static final String HEADER = "X-Workspace-Id";

  private final HttpServletRequest request;
  private final WorkspaceService workspaceService;
  private Users dataOwner;

  public WorkspaceContext(HttpServletRequest request, WorkspaceService workspaceService) {
    this.request = request;
    this.workspaceService = workspaceService;
  }

  public Users dataOwner(AppUserDetails details) {
    if (dataOwner != null) return dataOwner;
    Long workspaceId = parse(request.getHeader(HEADER));
    dataOwner = workspaceService.resolveDataOwner(details.getUserId(), workspaceId);
    return dataOwner;
  }

  private Long parse(String raw) {
    if (raw == null || raw.isBlank()) return null;
    try {
      long value = Long.parseLong(raw.trim());
      if (value <= 0) throw new NumberFormatException();
      return value;
    } catch (NumberFormatException ex) {
      throw new IllegalArgumentException("Invalid workspace id");
    }
  }
}
