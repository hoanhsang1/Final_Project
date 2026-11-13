package com.mems.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    // Chung
    INVALID_KEY(1001, HttpStatus.BAD_REQUEST, "Invalid validation key"),
    VALIDATION_ERROR(1002, HttpStatus.BAD_REQUEST, "Invalid request"),
    UNAUTHENTICATED(1003, HttpStatus.UNAUTHORIZED, "Valid Bearer token required"),
    FORBIDDEN(1004, HttpStatus.FORBIDDEN, "Access denied"),
    UNCATEGORIZED_EXCEPTION(1005, HttpStatus.INTERNAL_SERVER_ERROR, "Đã xảy ra lỗi hệ thống"),
    PASSWORD_CHANGE_REQUIRED(1006, HttpStatus.FORBIDDEN, "Change your temporary password first"),

    // Tài khoản / nhân sự
    ACCOUNT_EXISTS(2001, HttpStatus.CONFLICT, "Account already exists or organization is inactive"),
    ACCOUNT_NOT_FOUND(2002, HttpStatus.NOT_FOUND, "Identity account not found"),
    IDENTITY_UNAVAILABLE(2003, HttpStatus.SERVICE_UNAVAILABLE, "Identity service unavailable"),
    STAFF_CODE_EXISTS(2004, HttpStatus.CONFLICT, "Staff code already exists in organization"),
    EMAIL_EXISTS(2005, HttpStatus.CONFLICT, "Email already exists in organization"),
    MEMBER_NOT_FOUND(2006, HttpStatus.NOT_FOUND, "Department member not found"),
    INVALID_POSITION(2007, HttpStatus.BAD_REQUEST, "At least one TEACHER position is required"),
    PERMISSION_OUT_OF_MODULE(2008, HttpStatus.FORBIDDEN,
        "Cannot assign permission outside department modules"),

    // Phòng ban / chức vụ / quyền
    DEPARTMENT_NOT_FOUND(2101, HttpStatus.NOT_FOUND, "Department not found"),
    DEPARTMENT_NOT_EMPTY(2102, HttpStatus.CONFLICT, "Remove department members first"),
    POSITION_NOT_FOUND(2103, HttpStatus.NOT_FOUND, "Position not found"),
    POSITION_IN_USE(2104, HttpStatus.CONFLICT, "Position is assigned to members"),
    UNKNOWN_PERMISSION(2105, HttpStatus.BAD_REQUEST, "Unknown permission code"),
    MODULE_NOT_ENABLED(2106, HttpStatus.BAD_REQUEST, "Module is not enabled for organization"),

    // Sinh viên / lớp
    CLASS_NOT_FOUND(2201, HttpStatus.NOT_FOUND, "Class not found"),
    CLASS_NOT_EMPTY(2202, HttpStatus.CONFLICT, "Cannot delete class with enrolled students"),
    CLASS_NOT_CANCELLABLE(2203, HttpStatus.CONFLICT,
        "Only a class that has not finished, been cancelled or closed can be cancelled"),
    CLASS_NOT_CLOSABLE(2204, HttpStatus.CONFLICT, "A cancelled class cannot be closed"),
    CLASS_NOT_EDITABLE(2205, HttpStatus.CONFLICT, "A finished, cancelled or closed class is read-only"),
    CLASS_NOT_ASSIGNABLE(2206, HttpStatus.CONFLICT,
        "Teacher cannot be assigned to a finished, cancelled or closed class"),
    STATUS_CHANGED(2207, HttpStatus.CONFLICT, "Class status was changed by another request"),
    CLOSE_STATE_CHANGED(2208, HttpStatus.CONFLICT, "Class close state does not allow this action"),
    SELF_APPROVAL_NOT_ALLOWED(2209, HttpStatus.FORBIDDEN,
        "The requester cannot approve their own close request"),
    TEACHER_NOT_AVAILABLE(2210, HttpStatus.CONFLICT, "Teacher is not currently teaching"),
    TEACHER_ASSIGNMENT_MODULE_ACTIVE(2211, HttpStatus.CONFLICT,
        "Direct assignment is disabled while the teacher assignment module is enabled; "
            + "use the assignment workflow instead"),
    DATA_CHANGED(2212, HttpStatus.CONFLICT, "Class was changed by another request"),
    STUDENT_NOT_FOUND(2213, HttpStatus.NOT_FOUND, "Student not found"),
    STUDENT_ALREADY_IN_CLASS(2214, HttpStatus.CONFLICT,
        "Student is already enrolled in another class"),
    CONFLICT(2215, HttpStatus.CONFLICT, "Duplicate data or referenced record"),

    // Giáo viên / chuyên môn
    TEACHER_NOT_FOUND(2301, HttpStatus.NOT_FOUND, "Teacher not found"),
    INVALID_SPECIALTY(2302, HttpStatus.BAD_REQUEST,
        "specialtyIds: must reference active specialties of the organization"),
    SPECIALTY_EXISTS(2303, HttpStatus.CONFLICT, "Specialty already exists in organization"),
    SPECIALTY_MISMATCH(2304, HttpStatus.CONFLICT,
        "Specialties no longer match the subject of assigned classes"),

    // Validate DTO
    NAME_REQUIRED(3001, HttpStatus.BAD_REQUEST, "Name is required"),
    NAME_TOO_LONG(3002, HttpStatus.BAD_REQUEST, "Name is too long"),
    CODE_REQUIRED(3003, HttpStatus.BAD_REQUEST, "Code is required"),
    CODE_TOO_LONG(3004, HttpStatus.BAD_REQUEST, "Code is too long"),
    DESCRIPTION_TOO_LONG(3005, HttpStatus.BAD_REQUEST, "Description must be at most 1000 characters"),
    USERNAME_REQUIRED(3006, HttpStatus.BAD_REQUEST, "Username is required"),
    USERNAME_TOO_LONG(3007, HttpStatus.BAD_REQUEST, "Username is too long"),
    EMAIL_REQUIRED(3008, HttpStatus.BAD_REQUEST, "Email is required"),
    EMAIL_INVALID(3009, HttpStatus.BAD_REQUEST, "Email is invalid"),
    EMAIL_TOO_LONG(3010, HttpStatus.BAD_REQUEST, "Email is too long"),
    ROLE_REQUIRED(3011, HttpStatus.BAD_REQUEST, "Role is required"),
    ROLE_INVALID(3012, HttpStatus.BAD_REQUEST, "Role must be MANAGER or STAFF"),
    PHONE_TOO_LONG(3013, HttpStatus.BAD_REQUEST, "Phone is too long"),
    PHONE_REQUIRED(3042, HttpStatus.BAD_REQUEST, "Phone is required"),
    PHONE_INVALID(3014, HttpStatus.BAD_REQUEST, "Phone format is invalid"),
    STATUS_INVALID(3015, HttpStatus.BAD_REQUEST, "Status is invalid"),
    ACADEMIC_YEAR_TOO_LONG(3016, HttpStatus.BAD_REQUEST, "Academic year is too long"),
    REASON_REQUIRED(3017, HttpStatus.BAD_REQUEST, "Reason is required"),
    REASON_TOO_LONG(3018, HttpStatus.BAD_REQUEST, "Reason must be at most 1000 characters"),
    NOTE_TOO_LONG(3019, HttpStatus.BAD_REQUEST, "Note must be at most 1000 characters"),
    VERSION_REQUIRED(3020, HttpStatus.BAD_REQUEST, "Version is required"),
    VERSION_INVALID(3021, HttpStatus.BAD_REQUEST, "Version must not be negative"),
    DEPARTMENT_REQUIRED(3022, HttpStatus.BAD_REQUEST, "Department is required"),
    TEACHER_REQUIRED(3023, HttpStatus.BAD_REQUEST, "Teacher is required"),
    TEACHER_PROFILE_REQUIRED(3024, HttpStatus.BAD_REQUEST, "Teacher profile is required"),
    ID_TOO_LONG(3025, HttpStatus.BAD_REQUEST, "Id is too long"),
    MODULE_CODES_REQUIRED(3026, HttpStatus.BAD_REQUEST, "At least one module is required"),
    MODULE_CODES_TOO_MANY(3027, HttpStatus.BAD_REQUEST, "At most 6 modules are allowed"),
    MODULE_CODE_REQUIRED(3028, HttpStatus.BAD_REQUEST, "Module code must not be blank"),
    POSITION_IDS_REQUIRED(3029, HttpStatus.BAD_REQUEST, "At least one position is required"),
    POSITION_IDS_TOO_MANY(3030, HttpStatus.BAD_REQUEST, "At most 50 positions are allowed"),
    POSITION_ID_REQUIRED(3031, HttpStatus.BAD_REQUEST, "Position id must not be blank"),
    POSITION_ID_TOO_LONG(3032, HttpStatus.BAD_REQUEST, "Position id is too long"),
    SPECIALTY_IDS_REQUIRED(3033, HttpStatus.BAD_REQUEST, "At least one specialty is required"),
    SPECIALTY_IDS_TOO_MANY(3034, HttpStatus.BAD_REQUEST, "At most 20 specialties are allowed"),
    SPECIALTY_ID_REQUIRED(3035, HttpStatus.BAD_REQUEST, "Specialty id must not be blank"),
    SPECIALTY_ID_TOO_LONG(3036, HttpStatus.BAD_REQUEST, "Specialty id is too long"),
    CONTRACT_TYPE_INVALID(3037, HttpStatus.BAD_REQUEST, "Contract type must be CO_HUU or THINH_GIANG"),
    PERMISSIONS_REQUIRED(3038, HttpStatus.BAD_REQUEST, "At least one permission is required"),
    PERMISSIONS_TOO_MANY(3039, HttpStatus.BAD_REQUEST, "At most 50 permissions are allowed"),
    PERMISSION_CODE_REQUIRED(3040, HttpStatus.BAD_REQUEST, "Permission code must not be blank"),
    PERMISSION_CODE_TOO_LONG(3041, HttpStatus.BAD_REQUEST, "Permission code is too long");

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
