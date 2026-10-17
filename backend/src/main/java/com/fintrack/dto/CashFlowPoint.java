package com.fintrack.dto;

import java.time.LocalDate;

public record CashFlowPoint(LocalDate date, String income, String expense, String net) {}
