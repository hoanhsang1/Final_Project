package com.mems.exception;

import org.springframework.http.HttpStatus;

public class AppException extends RuntimeException {
    private final ErrorCode errorCode;
    private final HttpStatus status;

    public AppException(ErrorCode errorCode) {
        this(errorCode, errorCode.getStatus(), errorCode.getMessage());
    }

    public AppException(ErrorCode errorCode, String message) {
        this(errorCode, errorCode.getStatus(), message);
    }

    public AppException(ErrorCode errorCode, HttpStatus status) {
        this(errorCode, status, errorCode.getMessage());
    }

    private AppException(ErrorCode errorCode, HttpStatus status, String message) {
        super(message);
        this.errorCode = errorCode;
        this.status = status;
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return errorCode.name();
    }

    public int getNumericCode() {
        return errorCode.getCode();
    }
}
