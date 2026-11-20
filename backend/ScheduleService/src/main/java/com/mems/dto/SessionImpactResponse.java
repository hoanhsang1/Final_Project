package com.mems.dto;

import java.time.Instant;

public record SessionImpactResponse(
    String id,
    String sessionId,
    String classId,
    String className,
    String sourceType,
    String sourceId,
    Instant startTime,
    String roomId,
    String status,
    String details,
    Instant createdAt,
    Instant resolvedAt) {}
