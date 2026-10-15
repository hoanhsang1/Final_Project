package com.mems.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.mems.dto.ApiResponse;
import com.mems.exception.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log =
        LoggerFactory.getLogger(GlobalExceptionHandler.class);
    // Loi tham so khong hop le
    @ExceptionHandler (IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.failure(ex.getMessage()));
    }

    // Loi khong du kien
    @ExceptionHandler (Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception ex) {
        log.error("Unexpected error", ex);
        return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.failure("Đã xảy ra lỗi hệ thống"));
    }

    // Loi nghiep vu co HTTP status rieng
    @ExceptionHandler(ApiException.class) 
    public ResponseEntity<ApiResponse<Void>> handleApiException(ApiException ex) {
        return ResponseEntity
                    .status(ex.getStatus())
                    .body(ApiResponse.failure(ex.getMessage()));
    }
}
