package com.mems.scheduling;

import java.time.Instant;

/** Buổi đã có trên lịch; bộ xếp lịch chỉ đọc để tránh trùng, không sửa. */
public record ExistingSession(String teacherId, String roomId, String classId, Instant start, Instant end) {
}
