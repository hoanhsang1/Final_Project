package com.mems.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.Set;

public record MemberRequest(
    @NotBlank(message = "USERNAME_REQUIRED")
    @Size(max = 100, message = "USERNAME_TOO_LONG") String username,
    @NotBlank(message = "EMAIL_REQUIRED")
    @Email(message = "EMAIL_INVALID")
    @Size(max = 255, message = "EMAIL_TOO_LONG") String email,
    @NotBlank(message = "ROLE_REQUIRED")
    @Pattern(regexp = "MANAGER|STAFF", message = "ROLE_INVALID") String role,
    @NotNull(message = "POSITION_IDS_REQUIRED")
    @Size(max = 50, message = "POSITION_IDS_TOO_MANY")
    Set<@NotBlank(message = "POSITION_ID_REQUIRED") String> positionIds,
    @Size(max = 50, message = "CODE_TOO_LONG") String staffCode,
    @Size(max = 200, message = "NAME_TOO_LONG") String fullName,
    @Size(max = 30, message = "PHONE_TOO_LONG")
    @Pattern(regexp = "^$|^[0-9+()\\-\\s.]{6,30}$", message = "PHONE_INVALID") String phone,
    @Valid TeacherProfileRequest teacherProfile
) {}
