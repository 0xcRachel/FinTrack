package com.fintrack.security;

import com.fintrack.repository.UsersRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

  private final JwtAuthenticationFilter jwtFilter;
  private final JwtAuthenticationEntryPoint entryPoint;

  public SecurityConfig(JwtAuthenticationFilter jwtFilter,
                        JwtAuthenticationEntryPoint entryPoint) {
    this.jwtFilter = jwtFilter;
    this.entryPoint = entryPoint;
  }

  @Bean
  SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http.csrf(csrf -> csrf.disable())
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        .exceptionHandling(ex -> ex
            .authenticationEntryPoint(entryPoint)
            .accessDeniedHandler((request, response, accessDeniedException) -> {
              response.setStatus(403);
              response.setContentType("application/json");
              com.fasterxml.jackson.databind.ObjectMapper om =
                  new com.fasterxml.jackson.databind.ObjectMapper();
              com.fintrack.dto.ApiError err = com.fintrack.dto.ApiError.of(
                  403, "Forbidden", "You do not own this resource.", request.getRequestURI());
              om.writeValue(response.getWriter(), err);
            }))
        .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/v1/health/**", "/api/v1/auth/**",
                "/api-docs/**", "/swagger-ui.html", "/swagger-ui/**")
            .permitAll()
            .anyRequest().authenticated())
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }

  @Bean
  PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(10); }

  @Bean
  AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
    return config.getAuthenticationManager();
  }

  @Bean
  UserDetailsService userDetailsService(UsersRepository usersRepository) {
    return email -> {
      com.fintrack.entity.Users user = usersRepository.findByEmail(email);
      if (user == null) {
        throw new org.springframework.security.core.userdetails.UsernameNotFoundException("User not found");
      }
      return new AppUserDetails(user);
    };
  }

  /** Desktop-first CORS: only loopback dev server + Tauri webview origins. */
  private org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
    org.springframework.web.cors.CorsConfiguration config = new org.springframework.web.cors.CorsConfiguration();
    config.setAllowedOrigins(List.of(
        "http://localhost:1420", "http://127.0.0.1:1420", "tauri://localhost", "https://tauri.localhost"));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);
    config.setMaxAge(3600L);
    org.springframework.web.cors.UrlBasedCorsConfigurationSource source =
        new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", config);
    return source;
  }}
