package com.mems.dto;

import java.util.List;

/** Kết quả xếp lịch: các buổi đã xếp và các buổi thiếu dữ liệu/không tìm được chỗ. */
public record AutoScheduleResult(
    List<ScheduleResponse> scheduled,
    List<UnscheduledItem> unscheduled,
    Summary summary
) {
    public record UnscheduledItem(String classId, String className, String subjectName, String reason) {}

    public record Summary(int totalRequested, int scheduled, int unscheduled) {}
}
