package com.mems.dto;

import java.time.Instant;

/**
 * Một mục trong hộp duyệt vòng đời lớp: yêu cầu đóng lớp hoặc yêu cầu hủy lớp
 * đang chờ người gọi quyết định.
 */
public record ClassLifecycleInboxItem(
    String classId,
    String classCode,
    String className,
    String classStatus,
    /** {@code CLOSE} hoặc {@code CANCEL}. */
    String kind,
    String requesterId,
    String requesterName,
    String reason,
    Instant requestedAt,
    int studentCount
) {}
