package com.fintrack.security.dto;

import jakarta.validation.constraints.NotBlank;

/** Login payload. Validation is enforced by @Valid in the controller. */
public record AuthLoginRequest(
    @NotBlank(message = "Email is required")
    String email,

    @NotBlank(message = "Password is required")
    String password) {}
