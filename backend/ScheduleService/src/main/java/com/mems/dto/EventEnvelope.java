package com.mems.dto;

import com.fasterxml.jackson.databind.JsonNode;

/** Envelope event nhận từ People/Facility qua API nội bộ. */
public record EventEnvelope(
    String eventId,
    String eventType,
    Integer eventVersion,
    String organizationId,
    String aggregateType,
    String aggregateId,
    Long aggregateVersion,
    String occurredAt,
    String correlationId,
    JsonNode payload) {}
