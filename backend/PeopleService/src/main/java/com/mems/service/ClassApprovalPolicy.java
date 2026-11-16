package com.mems.service;

import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.security.Actor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

/**
 * Chính sách "ai được duyệt thay đổi vòng đời lớp" — quy tắc 14.
 *
 * <p>Mặc định (chưa chốt): trưởng phòng ban phụ trách module
 * {@value #MODULE_CODE} của tổ chức. Muốn đổi người duyệt, chỉ sửa
 * {@link #responsibleHeadIds(String)}.</p>
 *
 * <p>Escalation (kế hoạch v2 §1.5): nếu không có trưởng phòng nào được tìm thấy,
 * một Tổng quản lý đang hoạt động cũng có thể duyệt.</p>
 */
@Service
public class ClassApprovalPolicy {
    /**
     * TODO(PHẦN 5): xác nhận lại người duyệt thực tế. Hiện dùng chức danh
     * "Trưởng phòng"/"Trưởng phòng ban" của phòng ban phụ trách STUDENT_MANAGEMENT.
     */
    public static final List<String> HEAD_POSITION_NAMES = List.of("Trưởng phòng", "Trưởng phòng ban");
    public static final String MODULE_CODE = "STUDENT_MANAGEMENT";

    private final JdbcTemplate jdbc;
    private final Actor actor;

    public ClassApprovalPolicy(JdbcTemplate jdbc, Actor actor) {
        this.jdbc = jdbc;
        this.actor = actor;
    }

    public boolean canApprove(String orgId) {
        return actor.owner()
            || responsibleHeadIds(orgId).contains(actor.userId())
            || isActiveGeneralManager(orgId, actor.userId());
    }

    public void requireApprover(String orgId) {
        if (!canApprove(orgId)) {
            throw new AppException(ErrorCode.CLASS_APPROVER_NOT_ALLOWED);
        }
    }

    /**
     * Requires that the actor can approve AND is not the same person as the requester.
     * Use this variant for close/cancel approval to enforce the self-approval rule
     * (kế hoạch v2 §1.5).
     */
    public void requireApproverNotSelf(String orgId, String requesterId) {
        requireApprover(orgId);
        if (requesterId != null && requesterId.equals(actor.userId())) {
            throw new AppException(ErrorCode.SELF_APPROVAL_NOT_ALLOWED);
        }
    }

    /** Người duyệt mặc định: trưởng phòng ban phụ trách module đào tạo. */
    public Set<String> responsibleHeadIds(String orgId) {
        Timestamp now = Timestamp.from(Instant.now());
        List<Object> params = new java.util.ArrayList<>(List.of(orgId, MODULE_CODE));
        params.addAll(HEAD_POSITION_NAMES);
        params.add(now);
        params.add(now);
        return new TreeSet<>(jdbc.queryForList("""
            SELECT DISTINCT a.user_id
            FROM assignment a
            JOIN `position` p ON p.id=a.position_id AND p.org_id=a.org_id AND p.deleted_at IS NULL
            JOIN department_module dm ON dm.department_id=a.department_id AND dm.org_id=a.org_id
            WHERE a.org_id=? AND dm.module_code=? AND a.status='ACTIVE'
              AND a.scope_type='DEPARTMENT'
              AND p.name IN (?,?)
              AND a.effective_from<=? AND (a.effective_to IS NULL OR a.effective_to>=?)
            """, String.class, params.toArray()));
    }

    /**
     * Returns true if the user is an active Tổng quản lý WITH a valid delegation
     * from the Owner that includes {@code class.approve_close} permission
     * (kế hoạch v2 §1.5 — escalation requires both appointment AND explicit delegation).
     *
     * <p>Per GeneralManagerService: a Tổng quản lý has NO inherent rights; rights
     * only come from Owner delegation. An appointed GM without a delegation covering
     * {@code class.approve_close} cannot approve class lifecycle changes.</p>
     *
     * <p>This method does NOT fire if any responsible head exists (the caller short-circuits).
     * Self-approval is blocked separately by {@link #requireApproverNotSelf}.</p>
     */
    public boolean isActiveGeneralManager(String orgId, String userId) {
        Timestamp now = Timestamp.from(Instant.now());
        // 1. User must hold an active Tổng quản lý position assignment.
        Integer gmCount = jdbc.queryForObject("""
            SELECT COUNT(*)
            FROM assignment a
            JOIN `position` p ON p.id=a.position_id AND p.org_id=a.org_id
            WHERE a.org_id=? AND a.user_id=? AND a.status='ACTIVE'
              AND p.deleted_at IS NULL AND p.scope='ORGANIZATION'
              AND p.name=?
              AND a.effective_from<=? AND (a.effective_to IS NULL OR a.effective_to>=?)
            """, Integer.class, orgId, userId,
            com.mems.service.GeneralManagerService.GENERAL_MANAGER_POSITION_NAME, now, now);
        if (gmCount == null || gmCount == 0) return false;

        // 2. User must have an active delegation that includes class.approve_close.
        Integer delegationCount = jdbc.queryForObject("""
            SELECT COUNT(*)
            FROM delegation d
            JOIN delegation_permission dp ON dp.delegation_id = d.id
            WHERE d.org_id=? AND d.delegate_id=? AND d.status='ACTIVE'
              AND dp.permission_code='class.approve_close'
              AND d.effective_from<=?
              AND (d.effective_to IS NULL OR d.effective_to>=?)
            """, Integer.class, orgId, userId, now, now);
        return delegationCount != null && delegationCount > 0;
    }

    /** Người quản lý lớp: người tạo lớp + trưởng phòng phụ trách đào tạo. */
    public Set<String> classManagers(String orgId, String classCreatorId) {
        Set<String> result = responsibleHeadIds(orgId);
        if (classCreatorId != null && !classCreatorId.isBlank()) result.add(classCreatorId);
        return result;
    }
}
