package com.fintrack.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import com.fintrack.enums.ContributionType;

public record ContributionCreateRequest(
    BigDecimal amount,
    LocalDate contributionDate,
    ContributionType contributionType,
    String description
) {}
