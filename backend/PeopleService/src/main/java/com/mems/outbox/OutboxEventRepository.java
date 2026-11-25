package com.mems.outbox;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Outbox ghi cùng transaction nghiệp vụ. Publisher đọc sau commit và gửi HTTP nội bộ.
 * Trạng thái: PENDING → PUBLISHING → PUBLISHED | FAILED.
 */
@Repository
public class OutboxEventRepository {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    private final RowMapper<OutboxEventRow> rowMapper = (rs, n) -> new OutboxEventRow(
        rs.getString("event_id"),
        rs.getString("aggregate_type"),
        rs.getString("aggregate_id"),
        rs.getObject("aggregate_version") == null ? null : rs.getLong("aggregate_version"),
        rs.getString("event_type"),
        rs.getInt("event_version"),
        rs.getString("organization_id"),
        rs.getString("correlation_id"),
        rs.getString("payload"),
        rs.getInt("attempts"),
        rs.getString("status"),
        rs.getString("last_error"),
        rs.getTimestamp("created_at").toInstant()
    );

    public OutboxEventRepository(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    /** Gọi bên trong transaction nghiệp vụ; rollback sẽ xóa luôn event. */
    public String append(String organizationId, String aggregateType, String aggregateId,
                         Long aggregateVersion, String eventType, int eventVersion,
                         String correlationId, Object payload) {
        String eventId = UUID.randomUUID().toString();
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("""
            INSERT INTO outbox_event(event_id, aggregate_type, aggregate_id, aggregate_version,
                event_type, event_version, organization_id, correlation_id, payload,
                status, attempts, next_attempt_at, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,'PENDING',0,?,?)
            """, eventId, aggregateType, aggregateId, aggregateVersion, eventType, eventVersion,
            organizationId, correlationId, serialize(payload), now, now);
        return eventId;
    }

    public List<OutboxEventRow> findDue(Instant now, int limit) {
        return jdbc.query("""
            SELECT event_id, aggregate_type, aggregate_id, aggregate_version, event_type,
                   event_version, organization_id, correlation_id, payload, attempts, status,
                   last_error, created_at
            FROM outbox_event
            WHERE status='PENDING' AND next_attempt_at <= ?
            ORDER BY id
            LIMIT ?
            """, rowMapper, Timestamp.from(now), limit);
    }

    /** Chỉ một publisher thắng UPDATE; publisher khác nhận 0 và bỏ qua. */
    public boolean claim(String eventId, Instant lockedUntil) {
        return jdbc.update("""
            UPDATE outbox_event
            SET status='PUBLISHING', locked_until=?
            WHERE event_id=? AND status='PENDING'
            """, Timestamp.from(lockedUntil), eventId) == 1;
    }

    public void markPublished(String eventId) {
        jdbc.update("""
            UPDATE outbox_event
            SET status='PUBLISHED', published_at=?, locked_until=NULL, last_error=NULL
            WHERE event_id=?
            """, Timestamp.from(Instant.now()), eventId);
    }

    public void reschedule(String eventId, String status, int attempts,
                           Instant nextAttemptAt, String error) {
        jdbc.update("""
            UPDATE outbox_event
            SET status=?, attempts=?, next_attempt_at=?, last_error=?, locked_until=NULL
            WHERE event_id=?
            """, status, attempts, Timestamp.from(nextAttemptAt), truncate(error), eventId);
    }

    /** Thu hồi event kẹt PUBLISHING khi publisher chết trước khi đánh dấu. */
    public int reclaimStale(Instant now) {
        return jdbc.update("""
            UPDATE outbox_event
            SET status='PENDING', locked_until=NULL, attempts=attempts+1, next_attempt_at=?
            WHERE status='PUBLISHING' AND locked_until IS NOT NULL AND locked_until < ?
            """, Timestamp.from(now), Timestamp.from(now));
    }

    public OutboxEventRow find(String eventId) {
        List<OutboxEventRow> rows = jdbc.query("""
            SELECT event_id, aggregate_type, aggregate_id, aggregate_version, event_type,
                   event_version, organization_id, correlation_id, payload, attempts, status,
                   last_error, created_at
            FROM outbox_event WHERE event_id=?
            """, rowMapper, eventId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    /** Replay chỉ dành cho event FAILED thuộc đúng tổ chức; trả 0 nếu không khớp. */
    public int replay(String eventId, String organizationId, String actorId) {
        Timestamp now = Timestamp.from(Instant.now());
        return jdbc.update("""
            UPDATE outbox_event
            SET status='PENDING', attempts=0, next_attempt_at=?, locked_until=NULL,
                last_error=NULL, replayed_at=?, replayed_by=?
            WHERE event_id=? AND organization_id=? AND status='FAILED'
            """, now, now, actorId, eventId, organizationId);
    }

    public List<OutboxEventRow> list(String organizationId, String status, int limit, long afterId) {
        StringBuilder sql = new StringBuilder("""
            SELECT event_id, aggregate_type, aggregate_id, aggregate_version, event_type,
                   event_version, organization_id, correlation_id, payload, attempts, status,
                   last_error, created_at
            FROM outbox_event WHERE organization_id=? AND id > ?
            """);
        List<Object> args = new ArrayList<>(List.of(organizationId, afterId));
        if (status != null && !status.isBlank()) {
            sql.append(" AND status=?");
            args.add(status.trim().toUpperCase());
        }
        sql.append(" ORDER BY id LIMIT ?");
        args.add(limit);
        return jdbc.query(sql.toString(), rowMapper, args.toArray());
    }

    private String serialize(Object payload) {
        try {
            return mapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Cannot serialize outbox payload", ex);
        }
    }

    private String truncate(String value) {
        if (value == null) return null;
        return value.length() <= 1000 ? value : value.substring(0, 1000);
    }
}
