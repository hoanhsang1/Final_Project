package com.mems.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.Set;

public record TeacherCreateRequest(
    @NotBlank @Size(max = 36) String departmentId,
    @NotBlank @Size(max = 100) String username,
    @NotBlank @Email @Size(max = 255) String email,
    @NotBlank @Pattern(regexp = "MANAGER|STAFF") String role,
    @NotNull @Size(min = 1, max = 50) Set<@NotBlank String> positionIds,
    @NotBlank @Size(max = 50) String staffCode,
    @NotBlank @Size(max = 200) String fullName,
    @NotBlank @Size(max = 30) @Pattern(regexp = "^[0-9+()\\-\\s.]{6,30}$") String phone,
    @NotNull @Valid TeacherProfileRequest teacherProfile
) {}
