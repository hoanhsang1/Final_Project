package com.mems.dto;
import jakarta.validation.constraints.*;
public record ChangePasswordRequest(
    @NotBlank(message = "CURRENT_PASSWORD_REQUIRED") String currentPassword,
    @NotBlank(message = "NEW_PASSWORD_REQUIRED")
    @Size(min = 12, max = 72, message = "NEW_PASSWORD_INVALID") String newPassword) {}
