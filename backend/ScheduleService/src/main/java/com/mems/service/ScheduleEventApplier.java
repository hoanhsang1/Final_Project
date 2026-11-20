package com.mems.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mems.dto.EventEnvelope;
import com.mems.inbox.ConsumerStateRepository;
import com.mems.inbox.InboxRepository;
import com.mems.inbox.SessionImpactRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Áp dụng event trong một transaction: kiểm tra thứ tự, ghi `session_impact`,
 * đánh dấu inbox PROCESSED. Không đổi giáo viên/phòng/hủy buổi (SCH-01, CLS-03, SCH-04).
 */
@Service
public class ScheduleEventApplier {
    static final String CLASS_TEACHER_CHANGED = "CLASS_TEACHER_CHANGED";
    static final String CLASS_STATUS_CHANGED = "CLASS_STATUS_CHANGED";
    static final String FACILITY_INCIDENT = "FACILITY_INCIDENT";

    private final SessionImpactRepository impacts;
    private final ConsumerStateRepository state;
    private final InboxRepository inbox;
    private final ObjectMapper mapper;

    public ScheduleEventApplier(SessionImpactRepository impacts, ConsumerStateRepository state,
                                InboxRepository inbox, ObjectMapper mapper) {
        this.impacts = impacts;
        this.state = state;
        this.inbox = inbox;
        this.mapper = mapper;
    }

    @Transactional
    public void apply(EventEnvelope event, String consumerName, Instant occurredAt) {
        Instant now = Instant.now();
        if (isStale(event, occurredAt)) {
            inbox.markProcessed(event.eventId(), consumerName, now);
            return;
        }
        switch (event.eventType()) {
            case "ClassTeacherChanged" -> teacherChanged(event, occurredAt, now);
            case "ClassStatusChanged" -> statusChanged(event, occurredAt, now);
            case "FacilityIncidentOpened" -> incidentOpened(event, occurredAt, now);
            case "FacilityIncidentResolved" -> incidentResolved(event, occurredAt, now);
            default -> throw new IllegalArgumentException("Unsupported eventType: " + event.eventType());
        }
        state.upsert(consumerName, event.aggregateType(), event.aggregateId(),
            event.aggregateVersion(), occurredAt);
        inbox.markProcessed(event.eventId(), consumerName, now);
    }

    private boolean isStale(EventEnvelope event, Instant occurredAt) {
        ConsumerStateRepository.StateRow current = state.find(
            ScheduleEventConsumer.CONSUMER, event.aggregateType(), event.aggregateId());
        if (current == null) return false;
        if (event.aggregateVersion() != null && current.lastVersion() != null) {
            return event.aggregateVersion() <= current.lastVersion();
        }
        return current.lastOccurredAt() != null && !occurredAt.isAfter(current.lastOccurredAt());
    }

    private void teacherChanged(EventEnvelope event, Instant occurredAt, Instant now) {
        String classId = text(event.payload(), "classId", event.aggregateId());
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("classCode", text(event.payload(), "classCode", null));
        details.put("previousTeacherId", text(event.payload(), "previousTeacherId", null));
        details.put("newTeacherId", text(event.payload(), "newTeacherId", null));
        details.put("classVersion", event.aggregateVersion());
        String json = json(details);
        for (String sessionId : impacts.futureScheduledSessionsForClass(
                event.organizationId(), classId, occurredAt)) {
            impacts.insertImpact(event.organizationId(), sessionId, CLASS_TEACHER_CHANGED,
                classId, event.eventId(), json, now);
        }
    }

    private void statusChanged(EventEnvelope event, Instant occurredAt, Instant now) {
        String classId = text(event.payload(), "classId", event.aggregateId());
        String newStatus = text(event.payload(), "newStatus", null);
        String closeState = text(event.payload(), "closeState", null);
        boolean blocking = "DA_HUY".equals(newStatus) || "DA_KET_THUC".equals(newStatus)
            || "CLOSED".equals(closeState);
        if (!blocking) {
            impacts.resolve(impacts.openImpactIds(event.organizationId(), CLASS_STATUS_CHANGED, classId), now);
            return;
        }
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("classCode", text(event.payload(), "classCode", null));
        details.put("newStatus", newStatus);
        details.put("closeState", closeState);
        details.put("cancelState", text(event.payload(), "cancelState", null));
        details.put("reason", text(event.payload(), "reason", null));
        details.put("classVersion", event.aggregateVersion());
        String json = json(details);
        for (String sessionId : impacts.futureScheduledSessionsForClass(
                event.organizationId(), classId, occurredAt)) {
            impacts.insertImpact(event.organizationId(), sessionId, CLASS_STATUS_CHANGED,
                classId, event.eventId(), json, now);
        }
    }

    private void incidentOpened(EventEnvelope event, Instant occurredAt, Instant now) {
        String incidentId = text(event.payload(), "incidentId", event.aggregateId());
        String roomId = text(event.payload(), "roomId", null);
        if (roomId == null || roomId.isBlank()) return;
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("equipmentId", text(event.payload(), "equipmentId", null));
        details.put("equipmentName", text(event.payload(), "equipmentName", null));
        details.put("roomId", roomId);
        String json = json(details);
        for (String sessionId : impacts.futureScheduledSessionsForRoom(
                event.organizationId(), roomId, occurredAt)) {
            impacts.insertImpact(event.organizationId(), sessionId, FACILITY_INCIDENT,
                incidentId, event.eventId(), json, now);
        }
    }

    private void incidentResolved(EventEnvelope event, Instant occurredAt, Instant now) {
        String incidentId = text(event.payload(), "incidentId", event.aggregateId());
        String roomId = text(event.payload(), "roomId", null);
        impacts.resolve(impacts.openIncidentImpactIds(event.organizationId(), incidentId, roomId), now);
    }

    private String text(JsonNode payload, String field, String fallback) {
        if (payload == null || !payload.hasNonNull(field)) return fallback;
        return payload.get(field).asText();
    }

    private String json(Map<String, Object> value) {
        try {
            return mapper.writeValueAsString(value);
        } catch (Exception ex) {
            throw new IllegalStateException("Cannot serialize impact details", ex);
        }
    }
}
