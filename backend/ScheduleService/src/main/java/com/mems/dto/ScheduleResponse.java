package com.mems.dto;

import java.time.Instant;

public record ScheduleResponse(String id, String classId, String className, String teacherId,
                               String teacherName, String roomId, String roomCode,
                               String subjectName,
                               Instant startTime, Instant endTime, String status,
                               String departmentId) {
    public ScheduleResponse(String id, String classId, String className, String teacherId,
                            String roomId, Instant startTime, Instant endTime, String status,
                            String departmentId) {
        this(id, classId, className, teacherId, null, roomId, null, null, startTime, endTime, status, departmentId);
    }
}
