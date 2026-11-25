package com.mems.repository;

import com.mems.dto.AssignmentHistoryResponse;
import com.mems.dto.AuthorizationResponse;
import com.mems.dto.MemberDetailResponse;
import com.mems.dto.MemberResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.service.EffectivePermissionsService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

@Repository
public class MemberRepository {
    private final JdbcTemplate jdbc;
    private final EffectivePermissionsService effectivePermissions;
    private final AssignmentRepository assignments;

    public MemberRepository(JdbcTemplate jdbc, EffectivePermissionsService effectivePermissions,
                            AssignmentRepository assignments) {
        this.jdbc = jdbc;
        this.effectivePermissions = effectivePermissions;
        this.assignments = assignments;
    }

    public List<MemberResponse> list(String orgId, String departmentId) {
        return jdbc.queryForList(
            "SELECT user_id FROM department_member WHERE org_id=? AND department_id=? ORDER BY appointed_at",
            String.class, orgId, departmentId
        ).stream().map(id -> require(id, orgId, departmentId, false)).toList();
    }

    public MemberResponse require(String id, String orgId, String departmentId, boolean lock) {
        var rows = jdbc.query("""
            SELECT user_id, username, department_id, role, status, appointed_by, appointed_at
            FROM department_member WHERE user_id=? AND org_id=? AND department_id=?
            """ + (lock ? " FOR UPDATE" : ""),
            (rs, n) -> {
                Set<String> effective = effectivePermissions.resolve(orgId, id, departmentId).permissions();
                return new MemberResponse(
                    rs.getString("user_id"),
                    rs.getString("username"),
                    rs.getString("department_id"),
                    rs.getString("role"),
                    rs.getString("status"),
                    rs.getString("appointed_by"),
                    rs.getTimestamp("appointed_at").toInstant(),
                    positionIds(id),
                    effective
                );
            },
            id, orgId, departmentId
        );
        if (rows.isEmpty()) throw new AppException(ErrorCode.MEMBER_NOT_FOUND);
        return rows.get(0);
    }

    /** Chi tiết nhân sự. Email/điện thoại do service che theo quyền view_detail. */
    public MemberDetailResponse detail(String id, String orgId, String departmentId) {
        var rows = jdbc.query("""
            SELECT dm.user_id, dm.username, dm.department_id, d.name AS department_name,
                   dm.role, dm.status, dm.appointed_by, dm.appointed_at,
                   sp.staff_code, sp.full_name, sp.email, sp.phone,
                   tp.contract_type, tp.teaching_status,
                   (tp.user_id IS NOT NULL) AS is_teacher,
                   (SELECT COUNT(*) FROM school_class sc
                    WHERE sc.teacher_id=dm.user_id AND sc.org_id=dm.org_id
                      AND sc.deleted_at IS NULL
                      AND sc.status IN ('CHUA_BAT_DAU','DANG_DIEN_RA')) AS class_count
            FROM department_member dm
            JOIN department d ON d.id=dm.department_id AND d.org_id=dm.org_id
            LEFT JOIN staff_profile sp ON sp.user_id=dm.user_id AND sp.org_id=dm.org_id
            LEFT JOIN teacher_profile tp ON tp.user_id=dm.user_id AND tp.org_id=dm.org_id
            WHERE dm.user_id=? AND dm.org_id=? AND dm.department_id=?
            """,
            (rs, n) -> {
                boolean teacher = rs.getBoolean("is_teacher");
                long classCount = rs.getLong("class_count");
                boolean noClass = teacher && classCount == 0;
                Set<String> effective = effectivePermissions.resolve(orgId, id, departmentId).permissions();
                return new MemberDetailResponse(
                    rs.getString("user_id"), rs.getString("username"),
                    rs.getString("department_id"), rs.getString("department_name"),
                    rs.getString("role"), rs.getString("status"),
                    rs.getTimestamp("appointed_at") == null ? null : rs.getTimestamp("appointed_at").toInstant(),
                    rs.getString("appointed_by"),
                    rs.getString("staff_code"), rs.getString("full_name"),
                    rs.getString("email"), rs.getString("phone"),
                    teacher, rs.getString("contract_type"), rs.getString("teaching_status"),
                    positionIds(id), effective, classCount, noClass,
                    noClass ? "Chưa có lớp" : null,
                    assignments.history(id, orgId)
                );
            },
            id, orgId, departmentId
        );
        if (rows.isEmpty()) throw new AppException(ErrorCode.MEMBER_NOT_FOUND);
        return rows.get(0);
    }

    public List<AssignmentHistoryResponse> assignmentHistory(String id, String orgId) {
        return assignments.history(id, orgId);
    }

    public void markResigned(String userId, String orgId) {
        jdbc.update("""
            UPDATE department_member SET status='RESIGNED', resigned_at=?
            WHERE user_id=? AND org_id=? AND status='ACTIVE'
            """, Timestamp.from(Instant.now()), userId, orgId);
    }

    public void revokeAll(String userId, String orgId, String actorId, String reason) {
        assignments.replace(userId, orgId, null, Set.of(), actorId, reason);
    }

    /**
     * Áp dụng chuyển phòng: thu hồi assignment phạm vi DEPARTMENT của phòng cũ,
     * giữ assignment cấp ORGANIZATION, đồng bộ projection và đổi phòng.
     *
     * @return số chức danh phòng cũ bị thu hồi
     */
    public int transferToDepartment(String userId, String orgId, String fromDepartmentId,
                                    String toDepartmentId, String actorId, String reason) {
        int revoked = jdbc.update("""
            UPDATE assignment SET status='REVOKED', revoked_at=?, revoked_by=?, revoked_reason=?
            WHERE user_id=? AND org_id=? AND status='ACTIVE'
              AND scope_type='DEPARTMENT' AND department_id=?
            """, Timestamp.from(Instant.now()), actorId, reason,
            userId, orgId, fromDepartmentId);

        jdbc.update("DELETE FROM member_position WHERE user_id=? AND org_id=?", userId, orgId);
        jdbc.update("""
            INSERT INTO member_position(user_id, position_id, org_id)
            SELECT DISTINCT user_id, position_id, org_id FROM assignment
            WHERE user_id=? AND org_id=? AND status='ACTIVE'
            """, userId, orgId);

        jdbc.update("""
            UPDATE department_member SET department_id=?, appointed_by=?, appointed_at=?
            WHERE user_id=? AND org_id=? AND department_id=?
            """, toDepartmentId, actorId, Timestamp.from(Instant.now()),
            userId, orgId, fromDepartmentId);
        return revoked;
    }

    public Set<String> positionIds(String id) {
        return new TreeSet<>(jdbc.queryForList(
            "SELECT position_id FROM member_position WHERE user_id=? ORDER BY position_id",
            String.class, id
        ));
    }

    public void create(String userId, String orgId, String departmentId, String role, String appointedBy, String username) {
        jdbc.update(
            "INSERT INTO department_member(user_id, org_id, department_id, role, appointed_by, appointed_at, username) VALUES (?, ?, ?, ?, ?, ?, ?)",
            userId, orgId, departmentId, role, appointedBy, Timestamp.from(Instant.now()), username
        );
    }

    public void assign(String userId, String orgId, String departmentId, Set<String> positions, String actorId) {
        assignments.replace(userId, orgId, departmentId, positions, actorId);
    }

    public void assign(String userId, String orgId, String departmentId, Set<String> positions,
                       String actorId, String reason) {
        assignments.replace(userId, orgId, departmentId, positions, actorId, reason);
    }

    /** Ngừng nhân sự: thu hồi chức danh và đánh dấu RESIGNED, giữ hồ sơ để tra cứu. */
    public void offboard(String userId, String orgId, String actorId, String reason) {
        assignments.replace(userId, orgId, null, Set.of(), actorId, reason);
        jdbc.update("""
            UPDATE department_member SET status='RESIGNED', resigned_at=?
            WHERE user_id=? AND org_id=? AND status='ACTIVE'
            """, Timestamp.from(Instant.now()), userId, orgId);
    }

    public Optional<String> findDepartmentId(String userId, String orgId) {
        var rows = jdbc.queryForList(
            "SELECT department_id FROM department_member WHERE user_id=? AND org_id=?",
            String.class, userId, orgId);
        return rows.isEmpty() ? Optional.empty() : Optional.ofNullable(rows.get(0));
    }

    public AuthorizationResponse authorization(String userId, String orgId) {
        var rows = jdbc.queryForList("SELECT department_id, role FROM department_member WHERE user_id=? AND org_id=?", userId, orgId);
        if (rows.isEmpty()) return new AuthorizationResponse("STAFF", null, Set.of());
        String deptId = (String) rows.get(0).get("department_id");
        var effective = effectivePermissions.resolve(orgId, userId, deptId);
        return new AuthorizationResponse((String) rows.get(0).get("role"), deptId,
            effective.permissions(), effective.scopes(), effective.delegatedPermissions());
    }
}
