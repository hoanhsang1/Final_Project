package com.mems.exception;

import com.mems.dto.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AppException.class)
    ResponseEntity<ApiResponse<Void>> business(AppException ex) {
        return ResponseEntity.status(ex.getStatus())
            .body(ApiResponse.failure(ex.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiResponse<Void>> denied() {
        return failure(ErrorCode.FORBIDDEN);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiResponse<Void>> validation(MethodArgumentNotValidException ex) {
        String key = ex.getBindingResult().getFieldErrors().stream()
            .map(error -> error.getDefaultMessage())
            .filter(message -> message != null)
            .findFirst()
            .orElse(null);
        ErrorCode errorCode = ErrorCode.fromKey(key);
        if (errorCode != null) {
            return failure(errorCode);
        }
        String message = ex.getBindingResult().getFieldErrors().stream()
            .map(error -> error.getField() + ": " + error.getDefaultMessage())
            .sorted()
            .collect(java.util.stream.Collectors.joining("; "));
        return ResponseEntity.badRequest()
            .body(ApiResponse.failure(ErrorCode.INVALID_KEY.name(), message));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, ConstraintViolationException.class})
    ResponseEntity<ApiResponse<Void>> invalid(Exception ex) {
        return ResponseEntity.badRequest()
            .body(ApiResponse.failure(ErrorCode.VALIDATION_ERROR.name(), "Invalid request"));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ApiResponse<Void>> illegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.badRequest()
            .body(ApiResponse.failure(ErrorCode.VALIDATION_ERROR.name(), ex.getMessage()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiResponse<Void>> conflict() {
        return failure(ErrorCode.CONFLICT);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiResponse<Void>> unexpected(Exception ex) {
        log.error("Unexpected request failure", ex);
        return ResponseEntity.status(ErrorCode.UNCATEGORIZED_EXCEPTION.getStatus())
            .body(ApiResponse.failure(ErrorCode.UNCATEGORIZED_EXCEPTION.name(),
                ErrorCode.UNCATEGORIZED_EXCEPTION.getMessage()));
    }

    private ResponseEntity<ApiResponse<Void>> failure(ErrorCode errorCode) {
        return ResponseEntity.status(errorCode.getStatus())
            .body(ApiResponse.failure(errorCode.name(), errorCode.getMessage()));
    }
}
