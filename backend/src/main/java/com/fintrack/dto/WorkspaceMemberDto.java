package com.fintrack.dto;

import com.fintrack.enums.WorkspaceRole;

public record WorkspaceMemberDto(
    Long memberId,
    Long userId,
    String fullName,
    String email,
    String avatarUrl,
    WorkspaceRole role
) {}
