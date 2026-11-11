package com.fintrack.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record WorkspaceAddMemberRequest(
    @NotBlank(message = "Email is required")
    @Email(message = "Enter a valid email address")
    @Size(max = 255)
    String email
) {}
