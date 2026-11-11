package com.fintrack.controller;

import com.fintrack.dto.ProfileDto;
import com.fintrack.dto.ProfileUpdateRequest;
import com.fintrack.entity.Users;
import com.fintrack.repository.UsersRepository;
import com.fintrack.security.AppUserDetails;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Read and edit the signed-in user's profile (name + avatar). */
@RestController
@RequestMapping("/api/v1/profile")
public class ProfileController {

  private final UsersRepository usersRepository;

  public ProfileController(UsersRepository usersRepository) {
    this.usersRepository = usersRepository;
  }

  @GetMapping
  public ProfileDto get(@AuthenticationPrincipal AppUserDetails details) {
    return toDto(current(details));
  }

  @PutMapping
  public ProfileDto update(@AuthenticationPrincipal AppUserDetails details,
                           @Valid @RequestBody ProfileUpdateRequest req) {
    Users user = current(details);
    user.setFullName(req.fullName().trim());
    String avatar = req.avatarUrl();
    user.setAvatarUrl(avatar == null || avatar.isBlank() ? null : avatar);
    return toDto(usersRepository.save(user));
  }

  private Users current(AppUserDetails details) {
    return usersRepository.findById(details.getUserId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));
  }

  private ProfileDto toDto(Users user) {
    return new ProfileDto(user.getUserId(), user.getFullName(), user.getEmail(), user.getAvatarUrl());
  }
}
