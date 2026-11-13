package com.mems.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    // Chung
    INVALID_KEY(1001, HttpStatus.BAD_REQUEST, "Invalid validation key"),
    VALIDATION_ERROR(1002, HttpStatus.BAD_REQUEST, "Invalid request"),
    UNAUTHENTICATED(1003, HttpStatus.UNAUTHORIZED, "Service authentication required"),
    FORBIDDEN(1004, HttpStatus.FORBIDDEN, "Access denied"),
    UNCATEGORIZED_EXCEPTION(1005, HttpStatus.INTERNAL_SERVER_ERROR, "Đã xảy ra lỗi hệ thống"),
    PASSWORD_CHANGE_REQUIRED(1006, HttpStatus.FORBIDDEN, "Change your temporary password first"),

    // Tài khoản
    ACCOUNT_EXISTS(1101, HttpStatus.CONFLICT, "Account already exists"),
    ACCOUNT_NOT_FOUND(1102, HttpStatus.NOT_FOUND, "Account not found"),
    INVALID_CREDENTIALS(1103, HttpStatus.UNAUTHORIZED, "Invalid username or password"),
    INVALID_REFRESH_TOKEN(1104, HttpStatus.UNAUTHORIZED, "Invalid or expired refresh token"),
    ACCOUNT_NOT_ACTIVE(1105, HttpStatus.FORBIDDEN, "Account is not active"),
    ACCOUNT_NO_ROLES(1106, HttpStatus.FORBIDDEN, "Account has no assigned roles"),
    INVALID_SUPER_ADMIN(1107, HttpStatus.FORBIDDEN, "Invalid SUPER_ADMIN account configuration"),
    EMAIL_REQUIRED(1115, HttpStatus.BAD_REQUEST, "Email is required"),
    EMAIL_EXISTS(1114, HttpStatus.CONFLICT, "Email already exists"),
    ROLE_REQUIRED(1116, HttpStatus.BAD_REQUEST, "Role is required"),
    ROLE_NOT_ASSIGNABLE(1117, HttpStatus.BAD_REQUEST, "Cannot assign SUPER_ADMIN role"),
    INVALID_ROLE(1118, HttpStatus.BAD_REQUEST, "Invalid role: %s"),
    ACCOUNT_STATUS_INVALID(1119, HttpStatus.BAD_REQUEST, "Status must be active, locked, or disabled"),
    PASSWORD_TOO_SHORT(1120, HttpStatus.BAD_REQUEST, "Password must be at least 8 characters"),
    CURRENT_PASSWORD_INCORRECT(1121, HttpStatus.BAD_REQUEST, "Current password is incorrect"),
    PASSWORD_UNCHANGED(1122, HttpStatus.BAD_REQUEST,
        "Choose a different password, at most 72 UTF-8 bytes"),
    PROVISION_ROLLBACK_NOT_ALLOWED(1123, HttpStatus.CONFLICT,
        "Only unused provisioned accounts may be rolled back"),

    // Tổ chức
    ORGANIZATION_REQUIRED(1108, HttpStatus.FORBIDDEN, "Organization is required"),
    ORGANIZATION_NOT_FOUND(1109, HttpStatus.NOT_FOUND, "Organization not found"),
    ORGANIZATION_INACTIVE(1110, HttpStatus.FORBIDDEN, "Organization is not active"),
    ORGANIZATION_SUSPENDED(1111, HttpStatus.CONFLICT, "Organization is suspended"),
    ORGANIZATION_ALREADY_REVIEWED(1112, HttpStatus.CONFLICT,
        "Organization has already been reviewed"),
    USERNAME_EXISTS(1113, HttpStatus.CONFLICT, "Username already exists"),
    MODULES_EMPTY(1124, HttpStatus.BAD_REQUEST, "Modules list cannot be empty"),
    INVALID_MODULE(1125, HttpStatus.BAD_REQUEST, "Invalid module: %s"),
    DEPARTMENT_PERMISSIONS_UNAVAILABLE(1126, HttpStatus.SERVICE_UNAVAILABLE,
        "Department permissions are temporarily unavailable"),

    // Validate DTO
    USERNAME_REQUIRED(1201, HttpStatus.BAD_REQUEST, "Username is required"),
    PASSWORD_REQUIRED(1202, HttpStatus.BAD_REQUEST, "Password is required"),
    ORGANIZATION_TYPE_REQUIRED(1203, HttpStatus.BAD_REQUEST, "Organization type is required"),
    ORGANIZATION_NAME_REQUIRED(1204, HttpStatus.BAD_REQUEST, "Organization name is required"),
    ORGANIZATION_NAME_TOO_LONG(1205, HttpStatus.BAD_REQUEST, "Organization name is too long"),
    REGISTER_USERNAME_INVALID(1206, HttpStatus.BAD_REQUEST,
        "Username must be between 3 and 100 characters"),
    EMAIL_INVALID(1207, HttpStatus.BAD_REQUEST, "Email is invalid"),
    EMAIL_TOO_LONG(1208, HttpStatus.BAD_REQUEST, "Email is too long"),
    REGISTER_PASSWORD_TOO_SHORT(1209, HttpStatus.BAD_REQUEST,
        "Password must be at least 12 characters"),
    MODULES_REQUIRED(1210, HttpStatus.BAD_REQUEST, "At least one module is required"),
    MODULE_CODE_REQUIRED(1211, HttpStatus.BAD_REQUEST, "Module code must not be blank"),
    CURRENT_PASSWORD_REQUIRED(1212, HttpStatus.BAD_REQUEST, "Current password is required"),
    NEW_PASSWORD_INVALID(1213, HttpStatus.BAD_REQUEST,
        "Password must be between 12 and 72 characters"),
    REFRESH_TOKEN_REQUIRED(1214, HttpStatus.BAD_REQUEST, "Refresh token is required"),
    USER_ID_INVALID(1215, HttpStatus.BAD_REQUEST, "userId must be a valid UUID"),
    USER_ID_REQUIRED(1216, HttpStatus.BAD_REQUEST, "userId is required"),
    ORG_ID_REQUIRED(1217, HttpStatus.BAD_REQUEST, "orgId is required"),
    USERNAME_TOO_LONG(1218, HttpStatus.BAD_REQUEST, "Username is too long"),
    TEMPORARY_PASSWORD_INVALID(1219, HttpStatus.BAD_REQUEST,
        "Temporary password must be between 12 and 72 characters"),
    APPOINTED_BY_REQUIRED(1220, HttpStatus.BAD_REQUEST, "appointedBy is required"),
    ROLE_INVALID_PATTERN(1221, HttpStatus.BAD_REQUEST, "Role must be MANAGER or STAFF"),
    NEW_PASSWORD_REQUIRED(1222, HttpStatus.BAD_REQUEST, "New password is required"),
    TEMPORARY_PASSWORD_REQUIRED(1223, HttpStatus.BAD_REQUEST, "Temporary password is required");

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
