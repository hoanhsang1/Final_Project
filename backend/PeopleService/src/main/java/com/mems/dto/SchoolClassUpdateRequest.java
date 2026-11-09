package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record SchoolClassUpdateRequest(
    @NotBlank @Size(max = 200) String name,
    @Size(max = 50) String academicYear,
    LocalDate startDate,
    LocalDate endDate,
    @NotNull @PositiveOrZero Long version
) {}
