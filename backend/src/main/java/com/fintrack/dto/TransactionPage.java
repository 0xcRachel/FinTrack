package com.fintrack.dto;

import java.util.List;

public record TransactionPage(List<TransactionDto> content, Long totalElements,
                              Integer page, Integer size, Integer totalPages) {}
