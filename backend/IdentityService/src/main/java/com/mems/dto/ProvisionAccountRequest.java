package com.mems.dto;
import jakarta.validation.constraints.*;
public record ProvisionAccountRequest(
    @NotBlank(message = "USER_ID_REQUIRED")
    @Pattern(regexp = "[a-fA-F0-9-]{36}", message = "USER_ID_INVALID") String userId,
    @NotBlank(message = "ORG_ID_REQUIRED") String orgId,
    @NotBlank(message = "USERNAME_REQUIRED")
    @Size(max = 100, message = "USERNAME_TOO_LONG") String username,
    @NotBlank(message = "EMAIL_REQUIRED")
    @Email(message = "EMAIL_INVALID")
    @Size(max = 255, message = "EMAIL_TOO_LONG") String email,
    @NotBlank(message = "TEMPORARY_PASSWORD_REQUIRED")
    @Size(min = 12, max = 72, message = "TEMPORARY_PASSWORD_INVALID") String temporaryPassword,
    @NotBlank(message = "ROLE_REQUIRED")
    @Pattern(regexp = "MANAGER|STAFF", message = "ROLE_INVALID_PATTERN") String role,
    @NotBlank(message = "APPOINTED_BY_REQUIRED") String appointedBy) {}
