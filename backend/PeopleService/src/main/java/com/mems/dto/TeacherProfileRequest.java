package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.Set;

public record TeacherProfileRequest(
    @NotEmpty(message = "SPECIALTY_IDS_REQUIRED")
    @Size(max = 20, message = "SPECIALTY_IDS_TOO_MANY")
    Set<@NotBlank(message = "SPECIALTY_ID_REQUIRED")
        @Size(max = 36, message = "SPECIALTY_ID_TOO_LONG") String> specialtyIds,
    @Pattern(regexp = "CO_HUU|THINH_GIANG", message = "CONTRACT_TYPE_INVALID") String contractType
) {}
