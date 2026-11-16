package com.mems.repository;

import com.mems.dto.NotificationResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public class NotificationRepository {
    private final JdbcTemplate jdbc;

    public NotificationRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void create(String orgId, String userId, String type, String title, String body,
                       String entityType, String entityId) {
        jdbc.update("""
            INSERT INTO notification(id, org_id, user_id, type, title, body,
                entity_type, entity_id, created_at)
            VALUES (?,?,?,?,?,?,?,?,?)
            """, UUID.randomUUID().toString(), orgId, userId, type, title, body,
            entityType, entityId, Timestamp.from(Instant.now()));
    }

    public List<NotificationResponse> list(String orgId, String userId, int limit) {
        return jdbc.query("""
            SELECT id, type, title, body, entity_type, entity_id, read_at, created_at
            FROM notification
            WHERE org_id=? AND user_id=?
            ORDER BY created_at DESC, id
            LIMIT ?
            """, (rs, n) -> new NotificationResponse(
                rs.getString("id"), rs.getString("type"), rs.getString("title"),
                rs.getString("body"), rs.getString("entity_type"), rs.getString("entity_id"),
                rs.getTimestamp("read_at") == null ? null : rs.getTimestamp("read_at").toInstant(),
                rs.getTimestamp("created_at").toInstant()),
            orgId, userId, limit);
    }

    public void markRead(String orgId, String userId, String id) {
        jdbc.update("""
            UPDATE notification SET read_at=?
            WHERE id=? AND org_id=? AND user_id=? AND read_at IS NULL
            """, Timestamp.from(Instant.now()), id, orgId, userId);
    }

    public int markAllRead(String orgId, String userId) {
        return jdbc.update("""
            UPDATE notification SET read_at=?
            WHERE org_id=? AND user_id=? AND read_at IS NULL
            """, Timestamp.from(Instant.now()), orgId, userId);
    }
}
