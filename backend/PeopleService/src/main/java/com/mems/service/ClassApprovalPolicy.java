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
     * Returns true if the user currently holds an active Tổng quản lý assignment
     * (kế hoạch v2 §1.5 — escalation path when no responsible head is found).
     */
    public boolean isActiveGeneralManager(String orgId, String userId) {
        Timestamp now = Timestamp.from(Instant.now());
        Integer count = jdbc.queryForObject("""
            SELECT COUNT(*)
            FROM assignment a
            JOIN `position` p ON p.id=a.position_id AND p.org_id=a.org_id
            WHERE a.org_id=? AND a.user_id=? AND a.status='ACTIVE'
              AND p.deleted_at IS NULL AND p.scope='ORGANIZATION'
              AND p.name=?
              AND a.effective_from<=? AND (a.effective_to IS NULL OR a.effective_to>=?)
            """, Integer.class, orgId, userId,
            com.mems.service.GeneralManagerService.GENERAL_MANAGER_POSITION_NAME, now, now);
        return count != null && count > 0;
    }

    /** Người quản lý lớp: người tạo lớp + trưởng phòng phụ trách đào tạo. */
    public Set<String> classManagers(String orgId, String classCreatorId) {
        Set<String> result = responsibleHeadIds(orgId);
        if (classCreatorId != null && !classCreatorId.isBlank()) result.add(classCreatorId);
        return result;
    }
}
