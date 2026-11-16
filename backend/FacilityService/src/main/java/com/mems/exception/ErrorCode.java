package com.mems.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    INVALID_KEY(4001, HttpStatus.BAD_REQUEST, "Invalid validation key"),
    VALIDATION_ERROR(4002, HttpStatus.BAD_REQUEST, "Invalid request"),
    UNAUTHENTICATED(4003, HttpStatus.UNAUTHORIZED, "Valid Bearer token required"),
    FORBIDDEN(4004, HttpStatus.FORBIDDEN, "Access denied"),
    UNCATEGORIZED_EXCEPTION(4005, HttpStatus.INTERNAL_SERVER_ERROR, "Đã xảy ra lỗi hệ thống"),
    PASSWORD_CHANGE_REQUIRED(4006, HttpStatus.FORBIDDEN, "Change your temporary password first"),
    CONFLICT(4007, HttpStatus.CONFLICT, "Duplicate data or referenced record"),
    MODULE_NOT_ENABLED(4101, HttpStatus.BAD_REQUEST, "Module is not enabled for organization"),
    IDENTITY_UNAVAILABLE(4102, HttpStatus.SERVICE_UNAVAILABLE, "Identity service is unavailable"),
    ROOM_NOT_FOUND(4103, HttpStatus.NOT_FOUND, "Room not found"),
    ROOM_IN_USE(4104, HttpStatus.CONFLICT, "Room still has active equipment"),
    EQUIPMENT_NOT_FOUND(4105, HttpStatus.NOT_FOUND, "Equipment not found"),
    ISSUE_NOT_FOUND(4106, HttpStatus.NOT_FOUND, "Facility issue not found"),
    ISSUE_ALREADY_RESOLVED(4107, HttpStatus.CONFLICT, "Facility issue is already resolved"),
    INVALID_ROOM_TYPE(4108, HttpStatus.BAD_REQUEST, "Invalid room type");

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
