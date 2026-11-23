package com.mems.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ClassSubjectCreateRequest(
    @NotBlank String subjectId,
    @NotNull @Min(1) int plannedSessions,
    @NotNull @Min(1) int sessionMinutes,
    String teacherId
) {}
