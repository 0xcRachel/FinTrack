package com.fintrack.security;

import com.fintrack.repository.UsersRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Extracts the Bearer JWT, validates it, and populates SecurityContext with the userId.
 * Invalid/expired tokens simply leave the context empty (client gets 401/403 downstream).
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
  private final JwtUtil jwtUtil;
  private final UsersRepository usersRepository;

  public JwtAuthenticationFilter(JwtUtil jwtUtil, UsersRepository usersRepository) {
    this.jwtUtil = jwtUtil;
    this.usersRepository = usersRepository;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                  FilterChain filterChain)
      throws ServletException, IOException {
    final String authHeader = request.getHeader("Authorization");
    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      filterChain.doFilter(request, response);
      return;
    }

    final String jwt = authHeader.substring(7);
    if (!jwtUtil.isTokenValid(jwt)) {
      filterChain.doFilter(request, response);
      return;
    }

    try {
      final Long userId = jwtUtil.extractUserId(jwt);
      final com.fintrack.entity.Users user = usersRepository.findById(userId)
          .filter(u -> Boolean.TRUE.equals(u.getIsActive()))
          .orElse(null);
      if (user != null && SecurityContextHolder.getContext().getAuthentication() == null) {
        AppUserDetails details = new AppUserDetails(user);
        UsernamePasswordAuthenticationToken authToken =
            new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities());
        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authToken);
      }
    } catch (Exception ex) {
      log.debug("JWT filter skipped request due to: {}", ex.getMessage());
      SecurityContextHolder.clearContext();
    }
    filterChain.doFilter(request, response);
  }
}
