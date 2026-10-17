package com.fintrack.dto;

import java.time.LocalDate;
import com.fintrack.enums.TransactionType;

public record TransactionFilter(LocalDate startDate, LocalDate endDate, TransactionType type,
                                Long accountId, Long categoryId, String search,
                                Integer page, Integer size, String sort) {}
