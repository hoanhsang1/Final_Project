package com.mems.dto;

import java.time.Instant;

public record ClassStatusLogResponse(
    String id,
    String classId,
    String fromStatus,
    String toStatus,
    String reason,
    String changedBy,
    Instant changedAt
) {}
