package com.mems.dto;

import java.time.Instant;

public record TeacherHistoryResponse(
    String id,
    String action,
    String actorUserId,
    String actorName,
    Instant createdAt,
    Object details
) {}
