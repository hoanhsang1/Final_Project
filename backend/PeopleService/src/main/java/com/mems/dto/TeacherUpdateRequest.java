package com.mems.dto;

import jakarta.validation.constraints.*;

import java.util.Set;

public record TeacherUpdateRequest(
    @NotBlank(message = "NAME_REQUIRED")
    @Size(max = 200, message = "NAME_TOO_LONG") String fullName,
    @Email(message = "EMAIL_INVALID")
    @Size(max = 255, message = "EMAIL_TOO_LONG") String email,
    @Size(max = 30, message = "PHONE_TOO_LONG")
    @Pattern(regexp = "^$|^[0-9+()\\-\\s.]{6,30}$", message = "PHONE_INVALID") String phone,
    @NotEmpty(message = "SPECIALTY_IDS_REQUIRED")
    @Size(max = 20, message = "SPECIALTY_IDS_TOO_MANY")
    Set<@NotBlank(message = "SPECIALTY_ID_REQUIRED")
        @Size(max = 36, message = "SPECIALTY_ID_TOO_LONG") String> specialtyIds,
    @Pattern(regexp = "CO_HUU|THINH_GIANG", message = "CONTRACT_TYPE_INVALID") String contractType,
    @NotNull(message = "VERSION_REQUIRED")
    @PositiveOrZero(message = "VERSION_INVALID") Long version,
    Boolean confirm
) {}
