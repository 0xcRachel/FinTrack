package com.fintrack.dto;

import com.fintrack.enums.WorkspaceRole;
import com.fintrack.enums.WorkspaceType;

public record WorkspaceDto(
    Long workspaceId,
    String name,
    WorkspaceType type,
    WorkspaceRole role,
    Boolean isDefault,
    long memberCount
) {}
