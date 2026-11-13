package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record SchoolClassRequest(
    @NotBlank(message = "CODE_REQUIRED")
    @Size(max = 100, message = "CODE_TOO_LONG") String classCode,
    @NotBlank(message = "NAME_REQUIRED")
    @Size(max = 200, message = "NAME_TOO_LONG") String name,
    @Size(max = 50, message = "ACADEMIC_YEAR_TOO_LONG") String academicYear,
    LocalDate startDate,
    LocalDate endDate,
    @Pattern(regexp = "active|inactive|archived", message = "STATUS_INVALID") String status
) {}
