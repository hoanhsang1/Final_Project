package com.mems.repository;

import com.mems.dto.GeneralManagerCandidateResponse;
import com.mems.dto.GeneralManagerResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Truy vấn phục vụ chức danh cấp tổ chức "Tổng quản lý".
 *
 * <p>Bổ nhiệm chỉ thêm một assignment ORGANIZATION, không đụng các chức danh
 * khác của nhân sự (quy tắc 5).</p>
 */
@Repository
public class GeneralManagerRepository {
    private final JdbcTemplate jdbc;

    public GeneralManagerRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<GeneralManagerResponse> list(String orgId, String positionName) {
        Timestamp now = Timestamp.from(Instant.now());
        return jdbc.query("""
            SELECT a.user_id, dm.username, sp.full_name, dm.department_id,
                   d.name AS department_name, a.created_at
            FROM assignment a
            JOIN `position` p ON p.id=a.position_id AND p.org_id=a.org_id
            JOIN department_member dm ON dm.user_id=a.user_id AND dm.org_id=a.org_id
                AND dm.status='ACTIVE'
            LEFT JOIN staff_profile sp ON sp.user_id=a.user_id AND sp.org_id=a.org_id
            LEFT JOIN department d ON d.id=dm.department_id AND d.org_id=dm.org_id
            WHERE a.org_id=? AND a.status='ACTIVE' AND p.deleted_at IS NULL
              AND p.scope='ORGANIZATION' AND p.name=?
              AND a.effective_from<=? AND (a.effective_to IS NULL OR a.effective_to>=?)
            ORDER BY a.created_at, a.id
            """,
            (rs, n) -> new GeneralManagerResponse(
                rs.getString("user_id"), rs.getString("username"),
                rs.getString("full_name"), rs.getString("department_id"),
                rs.getString("department_name"),
                rs.getTimestamp("created_at") == null ? null
                    : rs.getTimestamp("created_at").toInstant()),
            orgId, positionName, now, now);
    }

    public List<GeneralManagerCandidateResponse> candidates(String orgId) {
        return jdbc.query("""
            SELECT dm.user_id, dm.username, sp.full_name, dm.department_id,
                   d.name AS department_name
            FROM department_member dm
            JOIN department d ON d.id=dm.department_id AND d.org_id=dm.org_id
            LEFT JOIN staff_profile sp ON sp.user_id=dm.user_id AND sp.org_id=dm.org_id
            WHERE dm.org_id=? AND dm.status='ACTIVE' AND dm.role <> 'OWNER'
            ORDER BY d.name, COALESCE(sp.full_name, dm.username)
            """,
            (rs, n) -> new GeneralManagerCandidateResponse(
                rs.getString("user_id"), rs.getString("username"),
                rs.getString("full_name"), rs.getString("department_id"),
                rs.getString("department_name")),
            orgId);
    }

    public boolean isActiveMember(String orgId, String userId) {
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM department_member WHERE org_id=? AND user_id=? "
                + "AND status='ACTIVE' AND role <> 'OWNER'",
            Integer.class, orgId, userId);
        return count != null && count > 0;
    }

    public boolean isGeneralManager(String orgId, String userId, String positionName) {
        Timestamp now = Timestamp.from(Instant.now());
        Integer count = jdbc.queryForObject("""
            SELECT COUNT(*)
            FROM assignment a
            JOIN `position` p ON p.id=a.position_id AND p.org_id=a.org_id
            WHERE a.org_id=? AND a.user_id=? AND a.status='ACTIVE'
              AND p.deleted_at IS NULL AND p.scope='ORGANIZATION' AND p.name=?
              AND a.effective_from<=? AND (a.effective_to IS NULL OR a.effective_to>=?)
            """, Integer.class, orgId, userId, positionName, now, now);
        return count != null && count > 0;
    }

    public String findPositionId(String orgId, String positionName) {
        List<String> ids = jdbc.queryForList(
            "SELECT id FROM `position` WHERE org_id=? AND name=? AND deleted_at IS NULL",
            String.class, orgId, positionName);
        return ids.isEmpty() ? null : ids.get(0);
    }

    public String createPosition(String orgId, String positionName, String description) {
        String id = UUID.randomUUID().toString();
        jdbc.update("""
            INSERT INTO `position`(id,org_id,name,description,created_at,profile_type,scope)
            VALUES (?,?,?,?,?,'GENERAL','ORGANIZATION')
            """, id, orgId, positionName, description, Timestamp.from(Instant.now()));
        return id;
    }

    /** Thêm assignment ORGANIZATION mà không thu hồi các chức danh đang có. */
    public void addAssignment(String orgId, String userId, String positionId, String actorId, String reason) {
        Integer active = jdbc.queryForObject("""
            SELECT COUNT(*) FROM assignment
            WHERE org_id=? AND user_id=? AND position_id=? AND status='ACTIVE'
            """, Integer.class, orgId, userId, positionId);
        if (active != null && active == 0) {
            jdbc.update("""
                INSERT INTO assignment(id,org_id,user_id,position_id,scope_type,department_id,
                    effective_from,effective_to,status,assigned_by,created_at,reason)
                VALUES (?,?,?,?,'ORGANIZATION',NULL,?,NULL,'ACTIVE',?,?,?)
                """, UUID.randomUUID().toString(), orgId, userId, positionId,
                Timestamp.from(Instant.now()), actorId, Timestamp.from(Instant.now()), reason);
        }
        Integer projected = jdbc.queryForObject(
            "SELECT COUNT(*) FROM member_position WHERE user_id=? AND position_id=?",
            Integer.class, userId, positionId);
        if (projected != null && projected == 0) {
            jdbc.update("INSERT INTO member_position(user_id,position_id,org_id) VALUES (?,?,?)",
                userId, positionId, orgId);
        }
    }

    /** Thu hồi riêng assignment của chức danh Tổng quản lý, giữ các chức danh khác. */
    public void revokeAssignment(String orgId, String userId, String positionId,
                                 String actorId, String reason) {
        jdbc.update("""
            UPDATE assignment SET status='REVOKED', revoked_at=?, revoked_by=?, revoked_reason=?
            WHERE org_id=? AND user_id=? AND position_id=? AND status='ACTIVE'
            """, Timestamp.from(Instant.now()), actorId, reason, orgId, userId, positionId);
        Integer remaining = jdbc.queryForObject("""
            SELECT COUNT(*) FROM assignment
            WHERE org_id=? AND user_id=? AND position_id=? AND status='ACTIVE'
            """, Integer.class, orgId, userId, positionId);
        if (remaining != null && remaining == 0) {
            jdbc.update("DELETE FROM member_position WHERE user_id=? AND position_id=? AND org_id=?",
                userId, positionId, orgId);
        }
    }
}
