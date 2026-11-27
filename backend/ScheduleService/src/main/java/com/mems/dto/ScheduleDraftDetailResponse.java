package com.mems.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Chi tiết lịch nháp theo một tuần (week 1..totalWeeks).
 * Luôn kèm danh sách mục chưa xếp được và số liệu tổng hợp.
 */
public record ScheduleDraftDetailResponse(
    String id, String status, String departmentId, List<String> classIds,
    LocalDate dateFrom, LocalDate dateTo, int week, int totalWeeks,
    List<ScheduleDraftItemResponse> items,
    List<ScheduleDraftUnscheduledResponse> unscheduled,
    int totalItems, int exceptionCount, int unscheduledCount,
    boolean complete, long steps, long elapsedMillis,
    Instant createdAt, Instant confirmedAt
) {}
