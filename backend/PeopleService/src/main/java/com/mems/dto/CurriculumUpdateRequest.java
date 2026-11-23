package com.mems.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CurriculumUpdateRequest(
    @NotBlank(message = "CODE_REQUIRED") @Size(max = 50, message = "CODE_TOO_LONG") String code,
    @NotBlank(message = "NAME_REQUIRED") @Size(max = 200, message = "NAME_TOO_LONG") String name,
    @Size(max = 1000, message = "DESCRIPTION_TOO_LONG") String description,
    @Size(max = 50) String gradeLevel,
    @Size(max = 50) String majorCode,
    @NotNull(message = "VERSION_REQUIRED") @Min(value = 0, message = "VERSION_INVALID") Integer version
) {}
