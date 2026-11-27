package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record ScheduleRequest(@NotBlank String classId, String teacherId, String teacherName,
                              String subjectName, String roomId,
                              @NotNull Instant startTime, @NotNull Instant endTime,
                              String subjectId) {
    public ScheduleRequest(String classId, String teacherId, String teacherName, String subjectName,
                           String roomId, Instant startTime, Instant endTime) {
        this(classId, teacherId, teacherName, subjectName, roomId, startTime, endTime, null);
    }
    public ScheduleRequest(String classId, String teacherId, String teacherName, String roomId, Instant startTime, Instant endTime) {
        this(classId, teacherId, teacherName, null, roomId, startTime, endTime, null);
    }
    public ScheduleRequest(String classId, String teacherId, String roomId, Instant startTime, Instant endTime) {
        this(classId, teacherId, null, null, roomId, startTime, endTime, null);
    }
}
