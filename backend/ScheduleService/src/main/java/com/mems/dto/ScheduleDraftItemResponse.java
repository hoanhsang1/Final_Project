package com.mems.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Một buổi dự kiến trong lịch nháp.
 * {@code date}/{@code periods} là giá trị suy ra từ giờ + cấu hình tiết để FE vẽ lưới tuần.
 */
public record ScheduleDraftItemResponse(
    String id, String classId, String subjectId, String subjectName,
    String teacherId, String teacherName, String roomId, String roomCode,
    Instant startTime, Instant endTime, LocalDate date, List<Integer> periods,
    int weekNo, boolean exception, String exceptionType, String exceptionReason,
    boolean manualEdit
) {}
