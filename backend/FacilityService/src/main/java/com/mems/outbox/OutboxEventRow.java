package com.mems.outbox;

import java.time.Instant;

public record OutboxEventRow(
    String eventId,
    String aggregateType,
    String aggregateId,
    Long aggregateVersion,
    String eventType,
    int eventVersion,
    String organizationId,
    String correlationId,
    String payload,
    int attempts,
    String status,
    String lastError,
    Instant createdAt) {}
