package com.mems.dto;

import java.time.Instant;

/** Một dòng lịch sử bổ nhiệm/thu hồi: ai, khi nào, phạm vi, lý do. */
public record AssignmentHistoryResponse(
    String id,
    String positionId,
    String positionName,
    String scopeType,
    String departmentId,
    Instant effectiveFrom,
    Instant effectiveTo,
    String status,
    String assignedBy,
    String assignedByName,
    Instant assignedAt,
    String reason,
    Instant revokedAt,
    String revokedBy,
    String revokedByName,
    String revokedReason
) {}
