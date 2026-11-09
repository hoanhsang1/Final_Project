package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record ClassTeacherAssignRequest(
    @NotBlank @Size(max = 36) String teacherId,
    @NotNull @PositiveOrZero Long version
) {}
