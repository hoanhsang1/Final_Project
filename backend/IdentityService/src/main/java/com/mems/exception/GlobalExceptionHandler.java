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
    public ResponseEntity<ApiResponse<Void>> handlingAppException(AppException ex) {
        return ResponseEntity.status(ex.getStatus())
            .body(ApiResponse.failure(ex.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handlingAccessDenied() {
        return failure(ErrorCode.FORBIDDEN);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handlingValidation(MethodArgumentNotValidException ex) {
        String enumKey = ex.getBindingResult().getFieldErrors().stream()
            .map(error -> error.getDefaultMessage())
            .filter(message -> message != null)
            .findFirst()
            .orElse(null);
        ErrorCode errorCode = ErrorCode.fromKey(enumKey);
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
    public ResponseEntity<ApiResponse<Void>> handlingInvalidRequest(Exception ex) {
        return ResponseEntity.badRequest()
            .body(ApiResponse.failure(ErrorCode.VALIDATION_ERROR.name(), "Invalid request"));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handlingIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.badRequest()
            .body(ApiResponse.failure(ErrorCode.VALIDATION_ERROR.name(), ex.getMessage()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handlingConflict() {
        return ResponseEntity.status(ErrorCode.VALIDATION_ERROR.getStatus())
            .body(ApiResponse.failure(ErrorCode.VALIDATION_ERROR.name(),
                "Duplicate data or referenced record"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handlingException(Exception ex) {
        log.error("Unexpected error", ex);
        return ResponseEntity.status(ErrorCode.UNCATEGORIZED_EXCEPTION.getStatus())
            .body(ApiResponse.failure(ErrorCode.UNCATEGORIZED_EXCEPTION.name(),
                ErrorCode.UNCATEGORIZED_EXCEPTION.getMessage()));
    }

    private ResponseEntity<ApiResponse<Void>> failure(ErrorCode errorCode) {
        return ResponseEntity.status(errorCode.getStatus())
            .body(ApiResponse.failure(errorCode.name(), errorCode.getMessage()));
    }
}
