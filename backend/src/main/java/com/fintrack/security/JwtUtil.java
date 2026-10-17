package com.fintrack.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * JWT utilities: sign/verify access tokens. Token carries the userId (subject) — never a plain
 * user id from the frontend; trust only what we signed.
 */
@Component
public class JwtUtil {

  private final byte[] secretBytes;
  private final long expirationMs;

  public JwtUtil(@Value("${app.jwt.secret}") String secret,
                 @Value("${app.jwt.expiration-ms}") long expirationMs) {
    this.secretBytes = secret.getBytes(StandardCharsets.UTF_8);
    this.expirationMs = expirationMs;
  }

  public String generateToken(Long userId) {
    Date now = new Date();
    return Jwts.builder()
        .subject(userId.toString())
        .issuedAt(now)
        .expiration(new Date(now.getTime() + expirationMs))
        .signWith(Keys.hmacShaKeyFor(secretBytes), SignatureAlgorithm.HS256)
        .compact();
  }

  public Long extractUserId(String token) {
    return Long.parseLong(extractClaims(token).getSubject());
  }

  public boolean isTokenValid(String token) {
    try {
      extractClaims(token);
      return !isExpired(token);
    } catch (Exception ex) {
      return false;
    }
  }

  private boolean isExpired(String token) {
    return extractClaims(token).getExpiration().before(new Date());
  }

  private Claims extractClaims(String token) {
    return Jwts.parser()
        .verifyWith(Keys.hmacShaKeyFor(secretBytes))
        .build()
        .parseSignedClaims(token)
        .getPayload();
  }
}
