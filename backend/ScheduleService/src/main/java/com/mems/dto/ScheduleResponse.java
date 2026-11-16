package com.mems.dto;

import java.time.Instant;

public record ScheduleResponse(String id, String classId, String className, String teacherId,
                               String roomId, Instant startTime, Instant endTime, String status,
                               String departmentId) {}
