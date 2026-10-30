package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SchoolClassUpdateRequest(
    @NotBlank @Size(max = 200) String name,
    @Size(max = 50) String academicYear,
    @Pattern(regexp = "active|inactive|archived") String status
) {}

