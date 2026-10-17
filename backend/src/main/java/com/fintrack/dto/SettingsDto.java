package com.fintrack.dto;

public record SettingsDto(String theme, String displayCurrency, String locale,
                          String dateFormat, String dashboardDefaultPeriod) {}
