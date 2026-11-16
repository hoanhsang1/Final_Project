package com.mems.service;

/**
 * Điểm móc khi giáo viên nghỉ việc mà vẫn đang phụ trách lớp.
 *
 * <p>TODO(PHẦN 5): đánh dấu các lớp {@code CHUA_BAT_DAU}/{@code DANG_DIEN_RA}
 * của giáo viên là "cần phân công lại" khi module phân công giáo viên hoàn thiện.
 * Hiện tại chỉ ghi log để luồng nghỉ việc không phụ thuộc vào Phần 5.</p>
 */
public interface TeacherOffboardingHook {
    void teacherNeedsReassignment(String orgId, String userId, long activeClassCount);
}
