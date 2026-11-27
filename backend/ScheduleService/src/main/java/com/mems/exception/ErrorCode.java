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
    ROOM_NOT_AVAILABLE(3113, HttpStatus.CONFLICT, "Room is unavailable"),
    ROOM_TYPE_MISMATCH(3114, HttpStatus.CONFLICT, "Room type does not match subject requirement"),
    TIME_SLOTS_REQUIRED(3115, HttpStatus.BAD_REQUEST, "At least one time slot is required"),
    TIME_SLOT_INVALID(3116, HttpStatus.BAD_REQUEST, "Time slot configuration is invalid"),
    CLASS_SLOT_RULE_INVALID(3117, HttpStatus.BAD_REQUEST, "Class slot rule is invalid"),
    TEACHER_AVAILABILITY_INVALID(3118, HttpStatus.BAD_REQUEST, "Teacher availability is invalid"),
    TEACHER_NOT_FOUND(3119, HttpStatus.NOT_FOUND, "Teacher not found in this organization"),
    SCHEDULE_CONFIG_MISSING(3120, HttpStatus.BAD_REQUEST,
        "Schedule periods are not configured for this organization"),
    SCHEDULE_DRAFT_NOT_FOUND(3121, HttpStatus.NOT_FOUND, "Schedule draft not found"),
    SCHEDULE_DRAFT_NOT_EDITABLE(3122, HttpStatus.CONFLICT,
        "Only DRAFT schedules can be changed"),
    SCHEDULE_DRAFT_EXPIRED(3123, HttpStatus.CONFLICT,
        "The draft is older than the confirmation window"),
    SCHEDULE_DRAFT_ITEM_NOT_FOUND(3124, HttpStatus.NOT_FOUND, "Draft session not found"),
    SCHEDULE_DRAFT_ITEM_CONFLICT(3125, HttpStatus.CONFLICT,
        "Draft session conflicts with another session"),
    SCHEDULE_DRAFT_CONFIRM_FAILED(3126, HttpStatus.CONFLICT,
        "Some draft sessions could not be confirmed"),
    SUBJECT_DAILY_LIMIT(3127, HttpStatus.CONFLICT,
        "Mỗi môn chỉ được xếp tối đa 1 buổi trong một ngày"),
    CLASS_DAILY_LIMIT(3128, HttpStatus.CONFLICT,
        "Mỗi lớp chỉ được xếp tối đa 2 buổi hoặc 240 phút trong một ngày");

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
