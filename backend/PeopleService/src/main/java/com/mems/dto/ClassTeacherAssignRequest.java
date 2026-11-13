package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record ClassTeacherAssignRequest(
    @NotBlank(message = "TEACHER_REQUIRED")
    @Size(max = 36, message = "ID_TOO_LONG") String teacherId,
    @NotNull(message = "VERSION_REQUIRED")
    @PositiveOrZero(message = "VERSION_INVALID") Long version
) {}
