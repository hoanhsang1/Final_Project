package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record SchoolClassUpdateRequest(
    @NotBlank(message = "NAME_REQUIRED")
    @Size(max = 200, message = "NAME_TOO_LONG") String name,
    @Size(max = 50, message = "ACADEMIC_YEAR_TOO_LONG") String academicYear,
    LocalDate startDate,
    LocalDate endDate,
    @NotNull(message = "VERSION_REQUIRED")
    @PositiveOrZero(message = "VERSION_INVALID") Long version
) {}
