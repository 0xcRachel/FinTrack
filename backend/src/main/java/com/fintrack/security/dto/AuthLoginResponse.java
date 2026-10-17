package com.fintrack.security.dto;

public record AuthLoginResponse(String accessToken, Long userId, String fullName, String email) {}
