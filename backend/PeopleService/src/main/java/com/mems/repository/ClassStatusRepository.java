package com.mems.repository;

import com.mems.dto.ClassCloseEventResponse;
import com.mems.dto.ClassStatusLogResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public class ClassStatusRepository {
    private final JdbcTemplate jdbc;

    public ClassStatusRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final RowMapper<ClassStatusLogResponse> logMapper = (rs, n) -> new ClassStatusLogResponse(
        rs.getString("id"),
        rs.getString("class_id"),
        rs.getString("from_status"),
        rs.getString("to_status"),
        rs.getString("reason"),
        rs.getString("changed_by"),
        rs.getTimestamp("changed_at") != null ? rs.getTimestamp("changed_at").toInstant() : null,
        rs.getString("actor_name")
    );

    private final RowMapper<ClassCloseEventResponse> eventMapper = (rs, n) -> {
        String action = rs.getString("action");
        String reason = rs.getString("reason");
        return new ClassCloseEventResponse(
            rs.getString("id"),
            rs.getString("class_id"),
            action,
            rs.getString("actor_id"),
            rs.getString("actor_name"),
            reason,
            "REQUESTED".equals(action) ? reason : null,
            rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toInstant() : null
        );
    };

    public record TransitionRow(String id, String status) {}

    public List<String> organizationsWithClasses() {
        return jdbc.queryForList(
            "SELECT DISTINCT org_id FROM school_class WHERE deleted_at IS NULL", String.class);
    }

    public List<TransitionRow> dueToStart(String orgId, LocalDate today) {
        return jdbc.query("""
            SELECT id, status FROM school_class
            WHERE org_id = ? AND deleted_at IS NULL AND status = 'CHUA_BAT_DAU'
              AND start_date IS NOT NULL AND start_date <= ?
            """, (rs, n) -> new TransitionRow(rs.getString("id"), rs.getString("status")),
            orgId, Date.valueOf(today));
    }

    public List<TransitionRow> dueToEnd(String orgId, LocalDate today) {
        return jdbc.query("""
            SELECT id, status FROM school_class
            WHERE org_id = ? AND deleted_at IS NULL AND status = 'DANG_DIEN_RA'
              AND end_date IS NOT NULL AND end_date < ?
            """, (rs, n) -> new TransitionRow(rs.getString("id"), rs.getString("status")),
            orgId, Date.valueOf(today));
    }

    public int transition(String id, String orgId, String fromStatus, String toStatus) {
        return jdbc.update("""
            UPDATE school_class
            SET status = ?, version = version + 1, updated_at = ?
            WHERE id = ? AND org_id = ? AND deleted_at IS NULL AND status = ?
            """, toStatus, Timestamp.from(Instant.now()), id, orgId, fromStatus);
    }

    public void insertStatusLog(String classId, String orgId, String fromStatus, String toStatus,
                                String reason, String changedBy) {
        jdbc.update("""
            INSERT INTO class_status_log(id, class_id, org_id, from_status, to_status, reason, changed_by, changed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, UUID.randomUUID().toString(), classId, orgId, fromStatus, toStatus, reason, changedBy,
            Timestamp.from(Instant.now()));
    }

    public List<ClassStatusLogResponse> statusLogs(String classId, String orgId) {
        return jdbc.query("""
            SELECT l.id, l.class_id, l.from_status, l.to_status, l.reason, l.changed_by, l.changed_at,
                   sp.full_name AS actor_name
            FROM class_status_log l
            LEFT JOIN staff_profile sp ON sp.user_id = l.changed_by AND sp.org_id = l.org_id
            WHERE l.class_id = ? AND l.org_id = ?
            ORDER BY l.changed_at ASC, l.id ASC
            """, logMapper, classId, orgId);
    }

    public int cancel(String id, String orgId, long expectedVersion) {
        return jdbc.update("""
            UPDATE school_class
            SET status = 'DA_HUY', version = version + 1, updated_at = ?
            WHERE id = ? AND org_id = ? AND deleted_at IS NULL AND version = ?
              AND status IN ('CHUA_BAT_DAU', 'DANG_DIEN_RA')
            """, Timestamp.from(Instant.now()), id, orgId, expectedVersion);
    }

    public int requestClose(String id, String orgId) {
        return jdbc.update("""
            UPDATE school_class
            SET close_state = 'PENDING', version = version + 1, updated_at = ?
            WHERE id = ? AND org_id = ? AND deleted_at IS NULL
              AND close_state = 'NONE' AND status <> 'DA_HUY'
            """, Timestamp.from(Instant.now()), id, orgId);
    }

    public int approveClose(String id, String orgId) {
        return jdbc.update("""
            UPDATE school_class
            SET close_state = 'CLOSED', version = version + 1, updated_at = ?
            WHERE id = ? AND org_id = ? AND deleted_at IS NULL AND close_state = 'PENDING'
            """, Timestamp.from(Instant.now()), id, orgId);
    }

    public int rejectClose(String id, String orgId) {
        return jdbc.update("""
            UPDATE school_class
            SET close_state = 'NONE', version = version + 1, updated_at = ?
            WHERE id = ? AND org_id = ? AND deleted_at IS NULL AND close_state = 'PENDING'
            """, Timestamp.from(Instant.now()), id, orgId);
    }

    public int reopen(String id, String orgId) {
        return jdbc.update("""
            UPDATE school_class
            SET close_state = 'NONE', version = version + 1, updated_at = ?
            WHERE id = ? AND org_id = ? AND deleted_at IS NULL AND close_state = 'CLOSED'
            """, Timestamp.from(Instant.now()), id, orgId);
    }

    public void insertCloseEvent(String classId, String orgId, String action, String actorId, String reason) {
        jdbc.update("""
            INSERT INTO class_close_event(id, class_id, org_id, action, actor_id, reason, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, UUID.randomUUID().toString(), classId, orgId, action, actorId, reason,
            Timestamp.from(Instant.now()));
    }

    public List<ClassCloseEventResponse> closeEvents(String classId, String orgId) {
        return jdbc.query("""
            SELECT e.id, e.class_id, e.action, e.actor_id, e.reason, e.created_at,
                   sp.full_name AS actor_name
            FROM class_close_event e
            LEFT JOIN staff_profile sp ON sp.user_id = e.actor_id AND sp.org_id = e.org_id
            WHERE e.class_id = ? AND e.org_id = ?
            ORDER BY e.created_at ASC, e.id ASC
            """, eventMapper, classId, orgId);
    }

    public String lastRequester(String classId, String orgId) {
        List<String> rows = jdbc.queryForList("""
            SELECT actor_id FROM class_close_event
            WHERE class_id = ? AND org_id = ? AND action = 'REQUESTED'
            ORDER BY created_at DESC, id DESC LIMIT 1
            """, String.class, classId, orgId);
        return rows.isEmpty() ? null : rows.get(0);
    }
}
