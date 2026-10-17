package com.fintrack.security;

import com.fintrack.security.dto.AuthLoginRequest;
import com.fintrack.security.dto.AuthLoginResponse;
import com.fintrack.security.dto.AuthRegisterRequest;
import com.fintrack.entity.Users;
import com.fintrack.repository.UsersRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Register + login. Passwords are BCrypt-hashed; the access token is JWT. */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

  private final UsersRepository usersRepository;
  private final JwtUtil jwtUtil;
  private final PasswordEncoder passwordEncoder;
  private final UserDetailsService userDetailsService;
  private final AuthenticationManager authenticationManager;

  public AuthController(UsersRepository usersRepository, JwtUtil jwtUtil,
                        PasswordEncoder passwordEncoder, UserDetailsService userDetailsService,
                        AuthenticationManager authenticationManager) {
    this.usersRepository = usersRepository;
    this.jwtUtil = jwtUtil;
    this.passwordEncoder = passwordEncoder;
    this.userDetailsService = userDetailsService;
    this.authenticationManager = authenticationManager;
  }

  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  public AuthLoginResponse register(@Valid @RequestBody AuthRegisterRequest req) {
    if (usersRepository.existsByEmail(req.email())) {
      throw new IllegalArgumentException("Email already registered");
    }
    Users user = usersRepository.save(new Users(req.fullName(), req.email(),
        passwordEncoder.encode(req.password())));
    String token = jwtUtil.generateToken(user.getUserId());
    return new AuthLoginResponse(token, user.getUserId(), user.getFullName(), user.getEmail());
  }

  @PostMapping("/login")
  public AuthLoginResponse login(@Valid @RequestBody AuthLoginRequest req) {
    try {
      authenticationManager.authenticate(
          new UsernamePasswordAuthenticationToken(req.email(), req.password()));
    } catch (BadCredentialsException ex) {
      throw new IllegalArgumentException("Invalid email or password");
    }
    Users user = usersRepository.findByEmail(req.email());
    if (user == null) {
      throw new IllegalArgumentException("Invalid email or password");
    }
    if (!Boolean.TRUE.equals(user.getIsActive())) {
      throw new IllegalArgumentException("Account is inactive");
    }
    String token = jwtUtil.generateToken(user.getUserId());
    return new AuthLoginResponse(token, user.getUserId(), user.getFullName(), user.getEmail());
  }
}
