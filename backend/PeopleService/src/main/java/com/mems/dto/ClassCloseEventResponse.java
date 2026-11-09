package com.mems.dto;

import java.time.Instant;

public record ClassCloseEventResponse(
    String id,
    String classId,
    String action,
    String actorId,
    String reason,
    Instant createdAt
) {}
