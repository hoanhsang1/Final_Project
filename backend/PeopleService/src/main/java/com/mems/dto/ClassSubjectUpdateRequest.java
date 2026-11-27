package com.mems.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ClassSubjectUpdateRequest(
    @Min(1) Integer plannedSessions,
    @Min(1) Integer sessionMinutes,
    @Min(1) Integer sessionsPerWeek,
    @Min(1) Integer stageNo,
    String teacherId,
    @NotNull(message = "VERSION_REQUIRED") @Min(value = 0, message = "VERSION_INVALID") Integer version
) {}
