package com.mems.dto;

import java.time.Instant;

public record ResignationResponse(
    String id,
    String userId,
    String username,
    String fullName,
    String departmentId,
    String reason,
    String status,
    String requestedBy,
    String requestedByName,
    Instant requestedAt,
    String decidedBy,
    String decidedByName,
    Instant decidedAt,
    /** Tên phòng ban của nhân sự — có thể null với dữ liệu cũ đã xoá phòng ban. */
    String departmentName,
    String decisionNote
) {}
