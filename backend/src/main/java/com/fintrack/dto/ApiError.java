package com.fintrack.dto;

import java.time.Instant;

/** Consistent API error envelope. Never carries stack traces or secrets. */
public record ApiError(Instant timestamp, int status, String error, String message, String path) {

  public static ApiError of(int status, String error, String message, String path) {
    return new ApiError(Instant.now(), status, error, message, path);
  }
}
