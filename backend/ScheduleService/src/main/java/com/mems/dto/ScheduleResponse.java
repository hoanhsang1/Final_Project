package com.mems.dto;

import java.time.Instant;

public record ScheduleResponse(String id, String classId, String teacherId, String roomId,
                               Instant startTime, Instant endTime, String status) {}
