package com.mems.dto;

import java.time.Instant;

/**
 * Sửa tay một buổi trong lịch nháp. Trường null nghĩa là giữ nguyên.
 * startTime/endTime phải đi cùng cặp; giờ được hiểu theo múi giờ nghiệp vụ khi tính tiết.
 */
public record ScheduleDraftPatchRequest(
    String roomId, Instant startTime, Instant endTime, String teacherId
) {}
