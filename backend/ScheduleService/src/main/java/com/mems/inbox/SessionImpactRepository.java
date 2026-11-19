package com.mems.inbox;

import com.mems.dto.SessionImpactResponse;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Buổi học bị ảnh hưởng bởi event liên service. Không sửa bảng `session`;
 * người có quyền tự xem và quyết định đổi giáo viên/phòng/hủy buổi.
 */
@Repository
public class SessionImpactRepository {
    private final JdbcTemplate jdbc;

    public SessionImpactRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<String> futureScheduledSessionsForClass(String orgId, String classId, Instant after) {
        return jdbc.queryForList("""
            SELECT s.id FROM session s JOIN `class` c ON c.id=s.class_id
            WHERE s.class_id=? AND c.org_id=? AND s.deleted_at IS NULL AND c.deleted_at IS NULL
              AND s.status='scheduled' AND s.start_time > ?
            ORDER BY s.start_time
            """, String.class, classId, orgId, Timestamp.from(after));
    }

    public List<String> futureScheduledSessionsForRoom(String orgId, String roomId, Instant after) {
        return jdbc.queryForList("""
            SELECT s.id FROM session s JOIN `class` c ON c.id=s.class_id
            WHERE c.org_id=? AND s.room_id=? AND s.deleted_at IS NULL AND c.deleted_at IS NULL
              AND s.status='scheduled' AND s.start_time > ?
            ORDER BY s.start_time
            """, String.class, orgId, roomId, Timestamp.from(after));
    }

    /** Replay/trùng event không tạo bản ghi lặp nhờ unique (session_id, source_type, event_id). */
    public void insertImpact(String orgId, String sessionId, String sourceType, String sourceId,
                             String eventId, String details, Instant now) {
        try {
            jdbc.update("""
                INSERT INTO session_impact(id, org_id, session_id, source_type, source_id, event_id,
                                           status, details, created_at)
                VALUES (?,?,?,?,?,?,'OPEN',?,?)
                """, UUID.randomUUID().toString(), orgId, sessionId, sourceType, sourceId, eventId,
                details, Timestamp.from(now));
        } catch (DuplicateKeyException alreadyRecorded) {
            // same event already applied to this session
        }
    }

    public List<String> openImpactIds(String orgId, String sourceType, String sourceId) {
        return jdbc.queryForList("""
            SELECT id FROM session_impact
            WHERE org_id=? AND source_type=? AND source_id=? AND status='OPEN'
            """, String.class, orgId, sourceType, sourceId);
    }

    /** Chỉ đóng impact khi buổi vẫn dùng đúng phòng đó và chưa bị hủy/đổi. */
    public List<String> openIncidentImpactIds(String orgId, String incidentId, String roomId) {
        if (roomId == null || roomId.isBlank()) return List.of();
        return jdbc.queryForList("""
            SELECT i.id FROM session_impact i JOIN session s ON s.id=i.session_id
            WHERE i.org_id=? AND i.source_type='FACILITY_INCIDENT' AND i.source_id=?
              AND i.status='OPEN' AND s.deleted_at IS NULL AND s.status='scheduled' AND s.room_id=?
            """, String.class, orgId, incidentId, roomId);
    }

    public void resolve(List<String> impactIds, Instant now) {
        if (impactIds.isEmpty()) return;
        String placeholders = String.join(",", impactIds.stream().map(id -> "?").toList());
        List<Object> args = new ArrayList<>();
        args.add(Timestamp.from(now));
        args.addAll(impactIds);
        jdbc.update("UPDATE session_impact SET status='RESOLVED', resolved_at=? WHERE id IN ("
            + placeholders + ")", args.toArray());
    }

    public List<SessionImpactResponse> list(String orgId, String departmentId, String status) {
        boolean filtered = status != null && !status.isBlank();
        String sql = """
            SELECT i.id, i.session_id, s.class_id, c.name AS class_name, i.source_type, i.source_id,
                   s.start_time, s.room_id, i.status, i.details, i.created_at, i.resolved_at
            FROM session_impact i
            JOIN session s ON s.id=i.session_id
            JOIN `class` c ON c.id=s.class_id
            WHERE i.org_id=? AND s.department_id=? AND s.deleted_at IS NULL AND c.deleted_at IS NULL
            """ + (filtered ? " AND i.status=? " : "") + " ORDER BY s.start_time";
        List<Object> args = new ArrayList<>(List.of(orgId, departmentId));
        if (filtered) args.add(status.trim().toUpperCase());
        return jdbc.query(sql, (rs, n) -> new SessionImpactResponse(
            rs.getString("id"), rs.getString("session_id"), rs.getString("class_id"),
            rs.getString("class_name"), rs.getString("source_type"), rs.getString("source_id"),
            rs.getTimestamp("start_time").toInstant(), rs.getString("room_id"),
            rs.getString("status"), rs.getString("details"),
            rs.getTimestamp("created_at").toInstant(),
            rs.getTimestamp("resolved_at") == null ? null : rs.getTimestamp("resolved_at").toInstant()),
            args.toArray());
    }
}
