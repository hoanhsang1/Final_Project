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
    String decisionNote
) {}
