package com.fintrack.exception;

import com.fintrack.dto.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import java.util.NoSuchElementException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Centralized exception handling. End users receive the {@link ApiError}
 * envelope — never stack traces, secrets or connection details.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(NoSuchElementException.class)
  public ResponseEntity<ApiError> handleNotFound(NoSuchElementException ex, HttpServletRequest req) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiError.of(404, "Not Found", ex.getMessage(), req.getRequestURI()));
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<ApiError> handleBadRequest(IllegalArgumentException ex, HttpServletRequest req) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(ApiError.of(400, "Bad Request", ex.getMessage(), req.getRequestURI()));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiError> handleUnexpected(Exception ex, HttpServletRequest req) {
    log.error("Unhandled error on {}: {}", req.getRequestURI(), ex.toString());
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(
            ApiError.of(
                500, "Internal Server Error", "An unexpected error occurred.", req.getRequestURI()));
  }
}
