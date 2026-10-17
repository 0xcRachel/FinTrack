package com.fintrack.dto;

public record CategoryUpdateRequest(String name, String description, String colorHex,
                                    String iconName) {}
