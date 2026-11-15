package com.mems.dto;

import java.time.Instant;
import java.util.Set;

/** Một lần ủy quyền kèm thông tin người nhận để hiển thị/audit. */
public record DelegationResponse(
    String id,
    String delegatorId,
    String delegatorName,
    String delegateId,
    String delegateName,
    String delegateUsername,
    String delegateDepartmentId,
    String delegateDepartmentName,
    Set<String> permissions,
    String scope,
    Instant effectiveFrom,
    Instant effectiveTo,
    String status,
    boolean active,
    String reason,
    Instant createdAt,
    Instant revokedAt,
    String revokedReason
) {}
