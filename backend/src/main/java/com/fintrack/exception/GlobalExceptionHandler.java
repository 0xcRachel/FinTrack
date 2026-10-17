package com.fintrack.exception;

import com.fintrack.dto.ApiError;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.NoSuchElementException;
import java.util.stream.Collectors;

/**
 * Centralized exception handling. End users receive the {@link ApiError} envelope — never stack
 * traces, secrets or connection details.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler({NoSuchElementException.class, EntityNotFoundException.class})
  public ResponseEntity<ApiError> handleNotFound(RuntimeException ex, HttpServletRequest req) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiError.of(404, "Not Found", ex.getMessage(), req.getRequestURI()));
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<ApiError> handleBadRequest(IllegalArgumentException ex, HttpServletRequest req) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(ApiError.of(400, "Bad Request", ex.getMessage(), req.getRequestURI()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex,
                                                   HttpServletRequest req) {
    String detail = ex.getBindingResult().getFieldErrors().stream()
        .map(FieldError::getDefaultMessage)
        .filter(java.util.Objects::nonNull)
        .collect(Collectors.joining("; "));
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(ApiError.of(400, "Bad Request",
            detail.isEmpty() ? "Invalid request data" : detail, req.getRequestURI()));
  }

  @ExceptionHandler(ConstraintViolationException.class)
  public ResponseEntity<ApiError> handleConstraint(ConstraintViolationException ex,
                                                   HttpServletRequest req) {
    String detail = ex.getConstraintViolations().stream()
        .map(v -> v.getPropertyPath() + ": " + v.getMessage())
        .collect(Collectors.joining("; "));
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(ApiError.of(400, "Bad Request",
            detail.isEmpty() ? "Constraint violation" : detail, req.getRequestURI()));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<ApiError> handleConflict(DataIntegrityViolationException ex,
                                                 HttpServletRequest req) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ApiError.of(409, "Conflict", "Operation conflicts with existing data.", req.getRequestURI()));
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ApiError> handleForbidden(AccessDeniedException ex,
                                                  HttpServletRequest req) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN)
        .body(ApiError.of(403, "Forbidden", "You do not own this resource.", req.getRequestURI()));
  }

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<ApiError> handleStatus(ResponseStatusException ex,
                                               HttpServletRequest req) {
    org.springframework.http.HttpStatusCode code = ex.getStatusCode();
    int sc = code != null ? code.value() : 500;
    String reason = ex.getReason() != null ? ex.getReason() : "Error";
    return ResponseEntity.status(sc)
        .body(ApiError.of(sc, reason, reason, req.getRequestURI()));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiError> handleUnexpected(Exception ex, HttpServletRequest req) {
    // Log server-side only; never return stack traces to the client.
    org.slf4j.LoggerFactory.getLogger(GlobalExceptionHandler.class)
        .error("Unhandled error on {}: {}", req.getRequestURI(), ex.toString());
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiError.of(500, "Internal Server Error", "An unexpected error occurred.",
            req.getRequestURI()));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<ApiError> handleUnreadable(HttpMessageNotReadableException ex,
                                                   HttpServletRequest req) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(ApiError.of(400, "Bad Request", "Malformed request body.", req.getRequestURI()));
  }

  @ExceptionHandler({org.springframework.web.bind.MissingServletRequestParameterException.class,
      org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class})
  public ResponseEntity<ApiError> handleBadParam(Exception ex, HttpServletRequest req) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(ApiError.of(400, "Bad Request", ex.getMessage(), req.getRequestURI()));
  }
}
