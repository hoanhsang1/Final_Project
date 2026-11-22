package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record ScheduleRequest(@NotBlank String classId, String teacherId, String teacherName,
                              String subjectName, String roomId,
                              @NotNull Instant startTime, @NotNull Instant endTime) {
    public ScheduleRequest(String classId, String teacherId, String teacherName, String roomId, Instant startTime, Instant endTime) {
        this(classId, teacherId, teacherName, null, roomId, startTime, endTime);
    }
    public ScheduleRequest(String classId, String teacherId, String roomId, Instant startTime, Instant endTime) {
        this(classId, teacherId, null, null, roomId, startTime, endTime);
    }
}
