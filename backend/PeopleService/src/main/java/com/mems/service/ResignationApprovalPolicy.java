package com.mems.service;

import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.security.Actor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

/**
 * Approval rules for resignation requests (kế hoạch v2 §1.5 / DEC-08).
 *
 * <p>Escalation order:</p>
 * <ol>
 *   <li>HR (or another member holding {@code employee.approve_resignation}) in the
 *       employee's department — but never the requester.</li>
 *   <li>Head of that department, when level 1 is unavailable.</li>
 *   <li>General manager holding an active delegation for the permission.</li>
 *   <li>Organization owner.</li>
 * </ol>
 *
 * <p>The requester is never an approver at any level. There is no timeout-based
 * auto-approval or auto-rejection.</p>
 */
@Service
public class ResignationApprovalPolicy {
    public static final String APPROVE_PERMISSION = "employee.approve_resignation";
    public static final List<String> HEAD_POSITION_NAMES =
        List.of("Trưởng phòng", "Trưởng phòng ban");

    private final JdbcTemplate jdbc;
    private final Actor actor;
    private final MembershipPolicy membership;
    private final EffectivePermissionsService effectivePermissions;

    public ResignationApprovalPolicy(JdbcTemplate jdbc, Actor actor, MembershipPolicy membership,
                                     EffectivePermissionsService effectivePermissions) {
        this.jdbc = jdbc;
        this.actor = actor;
        this.membership = membership;
        this.effectivePermissions = effectivePermissions;
    }

    public void requireApprover(String orgId, String departmentId, String requesterId) {
        String actorId = actor.userId();
        if (requesterId != null && requesterId.equals(actorId)) {
            throw new AppException(ErrorCode.SELF_APPROVAL_NOT_ALLOWED);
        }
        if (actor.owner()) return;

        // Level 1: any non-requester holder of the approval permission may decide.
        if (membership.hasPermission(departmentId, APPROVE_PERMISSION)) return;

        // A permission holder exists elsewhere: this actor cannot skip level 1.
        if (hasOtherPermissionHolder(orgId, departmentId, requesterId)) {
            throw new AppException(ErrorCode.RESIGNATION_APPROVER_NOT_ALLOWED);
        }

        // Level 2: department head when no eligible HR approver remains.
        if (headIds(orgId, departmentId).contains(actorId)) return;

        // Level 3: general manager with an active, matching delegation.
        if (hasDelegatedPermission(orgId, actorId)) return;

        throw new AppException(ErrorCode.RESIGNATION_APPROVER_NOT_ALLOWED);
    }

    /** Recipients to notify when a request is created (requesters excluded). */
    public Set<String> approverIds(String orgId, String departmentId, String requesterId) {
        Set<String> result = new TreeSet<>(headIds(orgId, departmentId));
        for (String userId : departmentMembers(orgId, departmentId)) {
            if (userId.equals(requesterId)) continue;
            if (effectivePermissions.resolve(orgId, userId, departmentId).permissions()
                .contains(APPROVE_PERMISSION)) {
                result.add(userId);
            }
        }
        result.remove(requesterId);
        return result;
    }

    public Set<String> headIds(String orgId, String departmentId) {
        Timestamp now = Timestamp.from(Instant.now());
        List<Object> params = new ArrayList<>(List.of(orgId, departmentId));
        params.addAll(HEAD_POSITION_NAMES);
        params.add(now);
        params.add(now);
        return new TreeSet<>(jdbc.queryForList("""
            SELECT DISTINCT a.user_id
            FROM assignment a
            JOIN `position` p ON p.id=a.position_id AND p.org_id=a.org_id AND p.deleted_at IS NULL
            WHERE a.org_id=? AND a.department_id=? AND a.status='ACTIVE'
              AND a.scope_type='DEPARTMENT' AND p.scope='DEPARTMENT'
              AND p.name IN (?,?)
              AND a.effective_from<=? AND (a.effective_to IS NULL OR a.effective_to>=?)
            """, String.class, params.toArray()));
    }

    private boolean hasOtherPermissionHolder(String orgId, String departmentId, String requesterId) {
        for (String userId : departmentMembers(orgId, departmentId)) {
            if (userId.equals(requesterId)) continue;
            if (effectivePermissions.resolve(orgId, userId, departmentId).permissions()
                .contains(APPROVE_PERMISSION)) {
                return true;
            }
        }
        return false;
    }

    private List<String> departmentMembers(String orgId, String departmentId) {
        return jdbc.queryForList("""
            SELECT user_id FROM department_member
            WHERE org_id=? AND department_id=? AND status='ACTIVE'
            """, String.class, orgId, departmentId);
    }

    private boolean hasDelegatedPermission(String orgId, String userId) {
        Timestamp now = Timestamp.from(Instant.now());
        Integer gmCount = jdbc.queryForObject("""
            SELECT COUNT(*)
            FROM assignment a
            JOIN `position` p ON p.id=a.position_id AND p.org_id=a.org_id AND p.deleted_at IS NULL
            WHERE a.org_id=? AND a.user_id=? AND a.status='ACTIVE'
              AND p.scope='ORGANIZATION' AND p.name=?
              AND a.effective_from<=? AND (a.effective_to IS NULL OR a.effective_to>=?)
            """, Integer.class, orgId, userId,
            GeneralManagerService.GENERAL_MANAGER_POSITION_NAME, now, now);
        if (gmCount == null || gmCount == 0) return false;
        return effectivePermissions.activeDelegationGrants(orgId, userId)
            .containsKey(APPROVE_PERMISSION);
    }
}
