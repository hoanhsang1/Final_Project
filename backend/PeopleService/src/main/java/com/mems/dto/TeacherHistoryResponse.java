package com.mems.dto;

import java.time.Instant;

public record TeacherHistoryResponse(
    String id,
    String action,
    String actorUserId,
    Instant createdAt,
    Object details
) {}
