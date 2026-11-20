package com.mems.dto;

import java.util.List;

/**
 * Kết quả của thuật toán xếp lịch tự động.
 *
 * @param scheduled   Danh sách buổi học đã xếp thành công.
 * @param unscheduled Danh sách buổi chưa xếp được, kèm lý do.
 * @param summary     Tóm tắt kết quả.
 */
public record AutoScheduleResult(
    List<ScheduleResponse> scheduled,
    List<UnscheduledItem> unscheduled,
    Summary summary
) {
    public record UnscheduledItem(
        String classId,
        String className,
        String subjectName,
        String reason
    ) {}

    public record Summary(int totalRequested, int scheduled, int unscheduled) {}
}
