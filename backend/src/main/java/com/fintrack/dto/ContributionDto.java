package com.fintrack.dto;

import java.time.Instant;
import java.time.LocalDate;
import com.fintrack.enums.ContributionType;

public record ContributionDto(
    Long contributionId,
    Long goalId,
    String amount,
    LocalDate contributionDate,
    ContributionType contributionType,
    String description,
    Instant createdAt
) {}
