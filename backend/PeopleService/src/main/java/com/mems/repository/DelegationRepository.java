package com.mems.repository;

import com.mems.dto.DelegationResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

/**
 * Ủy quyền quyền hạn (quy tắc 3, 7).
 *
 * <p>Không xoá cứng: thu hồi chỉ đổi {@code status='REVOKED'} và ghi lý do,
 * để giữ lịch sử. Quyền hiệu lực đọc bảng này ở mỗi lần kiểm tra.</p>
 */
@Repository
public class DelegationRepository {
    private final JdbcTemplate jdbc;

    public DelegationRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void insert(String id, String orgId, String delegatorId, String delegateId,
                       String scope, Instant effectiveFrom, Instant effectiveTo,
                       String reason, String actorId, Collection<String> permissions) {
        Instant now = Instant.now();
        jdbc.update("""
            INSERT INTO delegation(id,org_id,delegator_id,delegate_id,scope,effective_from,
                effective_to,status,reason,created_by,created_at)
            VALUES (?,?,?,?,?,?,?, 'ACTIVE',?,?,?)
            """, id, orgId, delegatorId, delegateId, scope, Timestamp.from(effectiveFrom),
            effectiveTo == null ? null : Timestamp.from(effectiveTo), reason, actorId,
            Timestamp.from(now));
        replacePermissions(id, permissions);
    }

    public void replacePermissions(String delegationId, Collection<String> permissions) {
        jdbc.update("DELETE FROM delegation_permission WHERE delegation_id=?", delegationId);
        new TreeSet<>(permissions).forEach(code -> jdbc.update(
            "INSERT INTO delegation_permission(delegation_id, permission_code) VALUES (?, ?)",
            delegationId, code));
    }

    public void updateWindow(String id, String orgId, Instant effectiveFrom, Instant effectiveTo,
                             String reason) {
        jdbc.update("""
            UPDATE delegation SET effective_from=?, effective_to=?, reason=?, updated_at=?
            WHERE id=? AND org_id=? AND status='ACTIVE'
            """, Timestamp.from(effectiveFrom),
            effectiveTo == null ? null : Timestamp.from(effectiveTo), reason,
            Timestamp.from(Instant.now()), id, orgId);
    }

    public void revoke(String id, String orgId, String actorId, String reason) {
        jdbc.update("""
            UPDATE delegation SET status='REVOKED', revoked_by=?, revoked_at=?, revoked_reason=?
            WHERE id=? AND org_id=? AND status='ACTIVE'
            """, actorId, Timestamp.from(Instant.now()), reason, id, orgId);
    }

    /** Thu hồi mọi ủy quyền còn ACTIVE của một người (khi bãi nhiệm Tổng quản lý). */
    public List<String> revokeAllForDelegate(String orgId, String delegateId, String actorId, String reason) {
        List<String> ids = jdbc.queryForList(
            "SELECT id FROM delegation WHERE org_id=? AND delegate_id=? AND status='ACTIVE'",
            String.class, orgId, delegateId);
        for (String id : ids) {
            jdbc.update("""
                UPDATE delegation SET status='REVOKED', revoked_by=?, revoked_at=?, revoked_reason=?
                WHERE id=? AND org_id=?
                """, actorId, Timestamp.from(Instant.now()), reason, id, orgId);
        }
        return ids;
    }

    /** DEL-04: chuyển ủy quyền quá hạn sang EXPIRED. Idempotent, chạy được nhiều instance. */
    public int markExpired() {
        Timestamp now = Timestamp.from(Instant.now());
        return jdbc.update("""
            UPDATE delegation SET status='EXPIRED', updated_at=?
            WHERE status='ACTIVE' AND effective_to IS NOT NULL AND effective_to<?
            """, now, now);
    }

    public DelegationResponse require(String id, String orgId) {
        List<DelegationResponse> rows = jdbc.query(baseSelect() + " WHERE d.id=? AND d.org_id=?",
            this::map, id, orgId);
        if (rows.isEmpty()) throw new AppException(ErrorCode.DELEGATION_NOT_FOUND);
        return rows.get(0);
    }

    public List<DelegationResponse> list(String orgId, boolean activeOnly) {
        String sql = baseSelect() + " WHERE d.org_id=?"
            + (activeOnly
                ? " AND d.status='ACTIVE' AND d.effective_from<=? AND (d.effective_to IS NULL OR d.effective_to>=?)"
                : "")
            + " ORDER BY d.created_at DESC, d.id";
        if (activeOnly) {
            Timestamp now = Timestamp.from(Instant.now());
            return jdbc.query(sql, this::map, orgId, now, now);
        }
        return jdbc.query(sql, this::map, orgId);
    }

    public List<DelegationResponse> listForDelegate(String orgId, String delegateId, boolean activeOnly) {
        String sql = baseSelect() + " WHERE d.org_id=? AND d.delegate_id=?"
            + (activeOnly
                ? " AND d.status='ACTIVE' AND d.effective_from<=? AND (d.effective_to IS NULL OR d.effective_to>=?)"
                : "")
            + " ORDER BY d.created_at DESC, d.id";
        if (activeOnly) {
            Timestamp now = Timestamp.from(Instant.now());
            return jdbc.query(sql, this::map, orgId, delegateId, now, now);
        }
        return jdbc.query(sql, this::map, orgId, delegateId);
    }

    /** Người nhận đã có ủy quyền còn ACTIVE (kể cả chưa tới effective_from) → cấm ủy quyền lại. */
    public boolean hasActiveAsDelegate(String orgId, String userId) {
        Integer count = jdbc.queryForObject("""
            SELECT COUNT(*) FROM delegation
            WHERE org_id=? AND delegate_id=? AND status='ACTIVE'
              AND (effective_to IS NULL OR effective_to>=?)
            """, Integer.class, orgId, userId, Timestamp.from(Instant.now()));
        return count != null && count > 0;
    }

    public Set<String> permissions(String delegationId) {
        return new TreeSet<>(jdbc.queryForList(
            "SELECT permission_code FROM delegation_permission WHERE delegation_id=?",
            String.class, delegationId));
    }

    private String baseSelect() {
        return """
            SELECT d.id, d.delegator_id, dp.full_name AS delegator_name,
                   d.delegate_id, ds.full_name AS delegate_name, dm.username AS delegate_username,
                   dm.department_id AS delegate_department_id, dd.name AS delegate_department_name,
                   d.scope, d.effective_from, d.effective_to, d.status, d.reason,
                   d.created_at, d.revoked_at, d.revoked_reason
            FROM delegation d
            LEFT JOIN department_member dm ON dm.user_id=d.delegate_id AND dm.org_id=d.org_id
            LEFT JOIN staff_profile ds ON ds.user_id=d.delegate_id AND ds.org_id=d.org_id
            LEFT JOIN staff_profile dp ON dp.user_id=d.delegator_id AND dp.org_id=d.org_id
            LEFT JOIN department dd ON dd.id=dm.department_id AND dd.org_id=dm.org_id
            """;
    }

    private DelegationResponse map(ResultSet rs, int rowNum) throws SQLException {
        Instant from = instant(rs.getTimestamp("effective_from"));
        Instant to = instant(rs.getTimestamp("effective_to"));
        String status = rs.getString("status");
        Instant now = Instant.now();
        boolean active = "ACTIVE".equals(status) && from != null && !from.isAfter(now)
            && (to == null || !to.isBefore(now));
        String id = rs.getString("id");
        return new DelegationResponse(
            id, rs.getString("delegator_id"), rs.getString("delegator_name"),
            rs.getString("delegate_id"), rs.getString("delegate_name"),
            rs.getString("delegate_username"),
            rs.getString("delegate_department_id"), rs.getString("delegate_department_name"),
            permissions(id), rs.getString("scope"), from, to, status, active,
            rs.getString("reason"), instant(rs.getTimestamp("created_at")),
            instant(rs.getTimestamp("revoked_at")), rs.getString("revoked_reason"));
    }

    private Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }
}
