package com.fintrack.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record WorkspaceCreateRequest(
    @NotBlank(message = "Workspace name is required")
    @Size(max = 60, message = "Workspace name must be 60 characters or fewer")
    String name,

    @NotBlank(message = "Workspace type is required")
    String type
) {}
