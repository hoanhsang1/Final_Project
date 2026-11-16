package com.mems.repository;

import com.mems.dto.AssignmentHistoryResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

/**
 * Lịch sử bổ nhiệm chức vụ. Không xoá cứng: thay đổi chức vụ sẽ REVOKE dòng cũ
 * và thêm dòng mới, để giữ lịch sử.
 *
 * <p>{@code member_position} vẫn được đồng bộ như projection của các assignment
 * đang ACTIVE để các truy vấn cũ (giáo viên, kiểm tra chức vụ đang dùng) không vỡ.</p>
 */
@Repository
public class AssignmentRepository {
    public record ActiveAssignment(String positionId, String scopeType, String departmentId) {}

    private final JdbcTemplate jdbc;

    public AssignmentRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<ActiveAssignment> active(String userId, String orgId) {
        return jdbc.query("""
            SELECT position_id, scope_type, department_id FROM assignment
            WHERE user_id=? AND org_id=? AND status='ACTIVE'
              AND effective_from<=? AND (effective_to IS NULL OR effective_to>=?)
            ORDER BY position_id
            """,
            (rs, n) -> new ActiveAssignment(rs.getString("position_id"), rs.getString("scope_type"),
                rs.getString("department_id")),
            userId, orgId, Timestamp.from(Instant.now()), Timestamp.from(Instant.now()));
    }

    public Set<String> activePositionIds(String userId, String orgId) {
        Set<String> ids = new TreeSet<>();
        active(userId, orgId).forEach(a -> ids.add(a.positionId()));
        return ids;
    }

    public void replace(String userId, String orgId, String memberDepartmentId,
                        Set<String> positionIds, String actorId) {
        replace(userId, orgId, memberDepartmentId, positionIds, actorId, null);
    }

    public void replace(String userId, String orgId, String memberDepartmentId,
                        Set<String> positionIds, String actorId, String reason) {
        Instant now = Instant.now();
        jdbc.update("""
            UPDATE assignment SET status='REVOKED', revoked_at=?, revoked_by=?, revoked_reason=?
            WHERE user_id=? AND org_id=? AND status='ACTIVE'
            """, Timestamp.from(now), actorId, reason, userId, orgId);

        Set<String> sorted = new TreeSet<>(positionIds == null ? Set.of() : positionIds);
        for (String positionId : sorted) {
            var rows = jdbc.queryForList(
                "SELECT scope, department_id FROM `position` WHERE id=? AND org_id=? AND deleted_at IS NULL",
                positionId, orgId);
            if (rows.isEmpty()) throw new AppException(ErrorCode.POSITION_NOT_FOUND);
            String scope = String.valueOf(rows.get(0).get("scope"));
            String positionDepartment = (String) rows.get(0).get("department_id");
            boolean organization = "ORGANIZATION".equals(scope);
            String departmentId = null;
            if (!organization) {
                if (positionDepartment != null && !positionDepartment.equals(memberDepartmentId)) {
                    throw new AppException(ErrorCode.FORBIDDEN,
                        "Position belongs to another department: " + positionId);
                }
                departmentId = positionDepartment != null ? positionDepartment : memberDepartmentId;
            }
            jdbc.update("""
                INSERT INTO assignment(id,org_id,user_id,position_id,scope_type,department_id,
                    effective_from,effective_to,status,assigned_by,created_at,reason,revoked_at,revoked_by,revoked_reason)
                VALUES (?,?,?,?,?,?,?,NULL,'ACTIVE',?,?,?,NULL,NULL,NULL)
                """, UUID.randomUUID().toString(), orgId, userId, positionId,
                organization ? "ORGANIZATION" : "DEPARTMENT", departmentId,
                Timestamp.from(now), actorId, Timestamp.from(now), reason);
        }

        jdbc.update("DELETE FROM member_position WHERE user_id=? AND org_id=?", userId, orgId);
        sorted.forEach(positionId -> jdbc.update(
            "INSERT INTO member_position(user_id, position_id, org_id) VALUES (?, ?, ?)",
            userId, positionId, orgId));
    }

    /** Toàn bộ lịch sử bổ nhiệm của một nhân viên, mới nhất trước. */
    public List<AssignmentHistoryResponse> history(String userId, String orgId) {
        return jdbc.query("""
            SELECT a.id, a.position_id, p.name AS position_name, a.scope_type, a.department_id,
                   a.effective_from, a.effective_to, a.status, a.assigned_by,
                   sap.full_name AS assigned_by_name, a.created_at, a.reason,
                   a.revoked_at, a.revoked_by, srp.full_name AS revoked_by_name, a.revoked_reason
            FROM assignment a
            JOIN `position` p ON p.id=a.position_id AND p.org_id=a.org_id
            LEFT JOIN staff_profile sap ON sap.user_id=a.assigned_by AND sap.org_id=a.org_id
            LEFT JOIN staff_profile srp ON srp.user_id=a.revoked_by AND srp.org_id=a.org_id
            WHERE a.user_id=? AND a.org_id=?
            ORDER BY a.created_at DESC, a.id
            """, (rs, n) -> new AssignmentHistoryResponse(
                rs.getString("id"), rs.getString("position_id"), rs.getString("position_name"),
                rs.getString("scope_type"), rs.getString("department_id"),
                instant(rs.getTimestamp("effective_from")), instant(rs.getTimestamp("effective_to")),
                rs.getString("status"), rs.getString("assigned_by"), rs.getString("assigned_by_name"),
                instant(rs.getTimestamp("created_at")), rs.getString("reason"),
                instant(rs.getTimestamp("revoked_at")), rs.getString("revoked_by"),
                rs.getString("revoked_by_name"), rs.getString("revoked_reason")),
            userId, orgId);
    }

    private Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }
}
