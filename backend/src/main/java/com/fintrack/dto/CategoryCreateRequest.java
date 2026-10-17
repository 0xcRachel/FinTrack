package com.fintrack.dto;

public record CategoryCreateRequest(
    String name,
    com.fintrack.enums.CategoryType categoryType,
    String description,
    String colorHex,
    String iconName
) {}
