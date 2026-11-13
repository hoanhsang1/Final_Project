package com.mems.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.Set;

public record MemberRequest(
    @NotBlank @Size(max = 100) String username,
    @NotBlank @Email @Size(max = 255) String email,
    @NotBlank @Pattern(regexp = "MANAGER|STAFF") String role,
    @NotNull @Size(max = 50) Set<@NotBlank String> positionIds,
    @Size(max = 50) String staffCode,
    @Size(max = 200) String fullName,
    @Size(max = 30) @Pattern(regexp = "^$|^[0-9+()\\-\\s.]{6,30}$") String phone,
    @Valid TeacherProfileRequest teacherProfile
) {}
