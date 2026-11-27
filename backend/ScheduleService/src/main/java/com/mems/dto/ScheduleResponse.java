package com.mems.dto;

import java.time.Instant;

/** Buổi học trả cho FE: kèm tên mô tả để bảng lịch không hiện UUID. */
public record ScheduleResponse(String id, String classId, String className,
                               String teacherId, String teacherName,
                               String roomId, String roomCode, String subjectName,
                               Instant startTime, Instant endTime, String status) {}
