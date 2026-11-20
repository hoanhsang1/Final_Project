package com.mems.inbox;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

/**
 * Idempotency theo cặp (event_id, consumer_name).
 * PROCESSING đang chạy → 409 để publisher thử lại; PROCESSED → 200; FAILED → cho xử lý lại.
 */
@Repository
public class InboxRepository {
    public enum StartResult { STARTED, RETRYING, ALREADY_PROCESSED, BUSY }

    private final JdbcTemplate jdbc;

    public InboxRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public StartResult start(String eventId, String consumerName, String eventType,
                             String organizationId, Instant now) {
        List<String> existing = statuses(eventId, consumerName);
        if (existing.isEmpty()) {
            try {
                jdbc.update("""
                    INSERT INTO inbox_event(event_id, consumer_name, event_type, organization_id,
                                            status, attempts, received_at)
                    VALUES (?,?,?,?,'PROCESSING',1,?)
                    """, eventId, consumerName, eventType, organizationId, Timestamp.from(now));
                return StartResult.STARTED;
            } catch (DuplicateKeyException concurrent) {
                existing = statuses(eventId, consumerName);
                if (existing.isEmpty()) throw concurrent;
            }
        }
        String status = existing.get(0);
        if ("PROCESSED".equals(status)) return StartResult.ALREADY_PROCESSED;
        if ("FAILED".equals(status)) {
            jdbc.update("""
                UPDATE inbox_event SET status='PROCESSING', attempts=attempts+1,
                       error_message=NULL, received_at=?
                WHERE event_id=? AND consumer_name=?
                """, Timestamp.from(now), eventId, consumerName);
            return StartResult.RETRYING;
        }
        return StartResult.BUSY;
    }

    public void markProcessed(String eventId, String consumerName, Instant now) {
        jdbc.update("""
            UPDATE inbox_event SET status='PROCESSED', processed_at=?, error_message=NULL
            WHERE event_id=? AND consumer_name=?
            """, Timestamp.from(now), eventId, consumerName);
    }

    public void markFailed(String eventId, String consumerName, String error) {
        String message = error == null ? null : (error.length() <= 1000 ? error : error.substring(0, 1000));
        jdbc.update("""
            UPDATE inbox_event SET status='FAILED', error_message=?
            WHERE event_id=? AND consumer_name=?
            """, message, eventId, consumerName);
    }

    private List<String> statuses(String eventId, String consumerName) {
        return jdbc.queryForList("""
            SELECT status FROM inbox_event WHERE event_id=? AND consumer_name=?
            """, String.class, eventId, consumerName);
    }
}
