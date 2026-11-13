package com.mems.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    INVALID_KEY(3001, HttpStatus.BAD_REQUEST, "Invalid validation key"),
    VALIDATION_ERROR(3002, HttpStatus.BAD_REQUEST, "Invalid request"),
    UNAUTHENTICATED(3003, HttpStatus.UNAUTHORIZED, "Valid Bearer token required"),
    FORBIDDEN(3004, HttpStatus.FORBIDDEN, "Access denied"),
    UNCATEGORIZED_EXCEPTION(3005, HttpStatus.INTERNAL_SERVER_ERROR, "Đã xảy ra lỗi hệ thống"),
    PASSWORD_CHANGE_REQUIRED(3006, HttpStatus.FORBIDDEN, "Change your temporary password first"),
    CONFLICT(3007, HttpStatus.CONFLICT, "Duplicate data or referenced record");

    private final int code;
    private final HttpStatus status;
    private final String message;

    ErrorCode(int code, HttpStatus status, String message) {
        this.code = code;
        this.status = status;
        this.message = message;
    }

    public int getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getMessage() {
        return message;
    }

    public static ErrorCode fromKey(String key) {
        if (key == null) {
            return null;
        }
        try {
            return ErrorCode.valueOf(key);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
