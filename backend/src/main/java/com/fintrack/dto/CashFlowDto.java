package com.fintrack.dto;

import java.time.LocalDate;
import java.util.List;

public record CashFlowDto(LocalDate periodStart, LocalDate periodEnd,
                          List<CashFlowPoint> points) {}
