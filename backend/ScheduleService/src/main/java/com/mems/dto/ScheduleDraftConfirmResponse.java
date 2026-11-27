package com.mems.dto;

import java.util.List;

/** Kết quả xác nhận lịch nháp: số buổi đã tạo, hoặc danh sách buổi lỗi (rollback toàn bộ). */
public record ScheduleDraftConfirmResponse(int created, List<FailedItem> failed) {
    public record FailedItem(String itemId, String classId, String subjectName, String reason) {}
}
