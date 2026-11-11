package com.fintrack.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProfileUpdateRequest(
    @NotBlank @Size(max = 100) String fullName,
    @Size(max = 400000) String avatarUrl
) {}
