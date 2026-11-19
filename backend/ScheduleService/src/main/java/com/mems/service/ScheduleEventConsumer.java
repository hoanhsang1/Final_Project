package com.mems.service;

import com.mems.dto.EventEnvelope;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.inbox.InboxRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.format.DateTimeParseException;

/**
 * Nhận event liên service. Inbox ghi trước (auto-commit) để chặn xử lý trùng;
 * phần áp dụng chạy trong transaction riêng, lỗi được đánh dấu FAILED để publisher retry.
 */
@Service
public class ScheduleEventConsumer {
    public static final String CONSUMER = "SCHEDULE_SYNC_V1";
    private static final Logger log = LoggerFactory.getLogger(ScheduleEventConsumer.class);

    private final InboxRepository inbox;
    private final ScheduleEventApplier applier;

    public ScheduleEventConsumer(InboxRepository inbox, ScheduleEventApplier applier) {
        this.inbox = inbox;
        this.applier = applier;
    }

    public void handle(EventEnvelope event) {
        validate(event);
        Instant occurredAt = occurredAt(event);
        InboxRepository.StartResult result = inbox.start(event.eventId(), CONSUMER,
            event.eventType(), event.organizationId(), Instant.now());
        if (result == InboxRepository.StartResult.ALREADY_PROCESSED) return;
        if (result == InboxRepository.StartResult.BUSY) {
            throw new AppException(ErrorCode.CONFLICT, "Event is already being processed");
        }
        try {
            applier.apply(event, CONSUMER, occurredAt);
        } catch (RuntimeException ex) {
            log.warn("Event {} failed: {}", event.eventId(), ex.getMessage());
            inbox.markFailed(event.eventId(), CONSUMER, ex.getMessage());
            throw ex;
        }
    }

    private void validate(EventEnvelope event) {
        if (event == null
                || blank(event.eventId()) || blank(event.eventType())
                || blank(event.organizationId()) || blank(event.aggregateType())
                || blank(event.aggregateId()) || event.payload() == null) {
            throw invalid("eventId, eventType, organizationId, aggregateType, aggregateId and payload are required");
        }
        if (event.eventVersion() == null || event.eventVersion() != 1) {
            throw invalid("Unsupported eventVersion");
        }
        if (event.payload().hasNonNull("organizationId")
                && !event.organizationId().equals(event.payload().get("organizationId").asText())) {
            throw invalid("payload.organizationId does not match envelope");
        }
    }

    private Instant occurredAt(EventEnvelope event) {
        if (blank(event.occurredAt())) return Instant.now();
        try {
            return Instant.parse(event.occurredAt());
        } catch (DateTimeParseException ex) {
            throw invalid("occurredAt must be ISO-8601");
        }
    }

    private AppException invalid(String message) {
        return new AppException(ErrorCode.VALIDATION_ERROR, message);
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
