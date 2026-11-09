package com.mems.dto;

import jakarta.validation.constraints.*;

import java.util.Set;

public record TeacherUpdateRequest(
    @NotBlank @Size(max = 200) String fullName,
    @Email @Size(max = 255) String email,
    @Size(max = 30) @Pattern(regexp = "^$|^[0-9+()\\-\\s.]{6,30}$") String phone,
    @NotNull @Size(min = 1, max = 20) Set<@NotBlank @Size(max = 36) String> specialtyIds,
    @Pattern(regexp = "CO_HUU|THINH_GIANG") String contractType,
    @NotNull @PositiveOrZero Long version,
    Boolean confirm
) {}
