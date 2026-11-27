package com.mems.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Dòng trong danh sách lịch nháp của phòng ban. */
public record ScheduleDraftSummaryResponse(
    String id, String status, String departmentId, List<String> classIds,
    LocalDate dateFrom, LocalDate dateTo, int itemCount, int unscheduledCount,
    int exceptionCount, Instant createdAt, Instant confirmedAt
) {}
