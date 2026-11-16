package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record ScheduleRequest(@NotBlank String classId, String teacherId, String roomId,
                              @NotNull Instant startTime, @NotNull Instant endTime) {}
