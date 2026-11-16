package com.mems.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    INVALID_KEY(3001, HttpStatus.BAD_REQUEST, "Invalid validation key"),
    VALIDATION_ERROR(3002, HttpStatus.BAD_REQUEST, "Invalid request"),
    UNAUTHENTICATED(3003, HttpStatus.UNAUTHORIZED, "Valid Bearer token required"),
    FORBIDDEN(3004, HttpStatus.FORBIDDEN, "Access denied"),
    UNCATEGORIZED_EXCEPTION(3005, HttpStatus.INTERNAL_SERVER_ERROR, "Đã xảy ra lỗi hệ thống"),
    PASSWORD_CHANGE_REQUIRED(3006, HttpStatus.FORBIDDEN, "Change your temporary password first"),
    CONFLICT(3007, HttpStatus.CONFLICT, "Duplicate data or referenced record"),
    MODULE_NOT_ENABLED(3101, HttpStatus.BAD_REQUEST, "Module is not enabled for organization"),
    IDENTITY_UNAVAILABLE(3102, HttpStatus.SERVICE_UNAVAILABLE, "Identity service is unavailable"),
    PEOPLE_UNAVAILABLE(3103, HttpStatus.SERVICE_UNAVAILABLE, "People service is unavailable"),
    FACILITY_UNAVAILABLE(3104, HttpStatus.SERVICE_UNAVAILABLE, "Facility service is unavailable"),
    CLASS_NOT_FOUND(3105, HttpStatus.NOT_FOUND, "Class not found"),
    CLASS_NOT_SCHEDULABLE(3106, HttpStatus.BAD_REQUEST, "Class is closed or cancelled"),
    TEACHER_NOT_ASSIGNED(3107, HttpStatus.BAD_REQUEST, "Teacher is not assigned to this class"),
    INVALID_TIME_RANGE(3108, HttpStatus.BAD_REQUEST, "End time must be after start time"),
    SCHEDULE_NOT_FOUND(3109, HttpStatus.NOT_FOUND, "Schedule session not found"),
    TEACHER_SCHEDULE_CONFLICT(3110, HttpStatus.CONFLICT, "Teacher already has a session in this time range"),
    ROOM_SCHEDULE_CONFLICT(3111, HttpStatus.CONFLICT, "Room is already booked in this time range"),
    CLASS_SCHEDULE_CONFLICT(3112, HttpStatus.CONFLICT, "Class already has a session in this time range"),
    ROOM_NOT_AVAILABLE(3113, HttpStatus.CONFLICT, "Room is unavailable");

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
