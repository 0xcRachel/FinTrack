package com.fintrack.dto;

public record SettingsUpdateRequest(String theme, String displayCurrency, String locale,
                                    String dateFormat, String dashboardDefaultPeriod) {}
