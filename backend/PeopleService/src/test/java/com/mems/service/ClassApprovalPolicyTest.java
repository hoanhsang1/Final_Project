package com.mems.service;

import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.security.Actor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link ClassApprovalPolicy} (B3, B5 — kế hoạch v2 §1.5).
 *
 * Coverage:
 *  P-01  Owner can always approve
 *  P-02  Head of responsible department can approve
 *  P-03  Active Tổng quản lý can approve (escalation path)
 *  P-04  Regular staff cannot approve → CLASS_APPROVER_NOT_ALLOWED
 *  P-05  Self-approval blocked → SELF_APPROVAL_NOT_ALLOWED
 *  P-06  Owner can approve when requester is different person
 *
 * Note: ACADEMIC_MANAGEMENT bundle regression guard (class.approve_close removal)
 * is covered in IdentityService's PermissionCatalogTest.
 */
class ClassApprovalPolicyTest {

    private JdbcTemplate jdbc;
    private Actor actor;
    private ClassApprovalPolicy policy;

    private static final String ORG_ID = "org-001";
    private static final String HEAD_USER_ID = "head-001";
    private static final String GM_USER_ID = "gm-001";
    private static final String STAFF_USER_ID = "staff-001";
    private static final String OWNER_USER_ID = "owner-001";
    private static final String REQUESTER_ID = "requester-001";

    @BeforeEach
    void setUp() {
        jdbc = mock(JdbcTemplate.class);
        actor = mock(Actor.class);
        policy = new ClassApprovalPolicy(jdbc, actor);

        // Default: actor is not owner
        when(actor.owner()).thenReturn(false);
        // Default: no responsible heads
        when(jdbc.queryForList(contains("FROM assignment"), eq(String.class), any()))
            .thenReturn(List.of());
        // Default: actor is not a general manager
        when(jdbc.queryForObject(contains("p.scope='ORGANIZATION'"), eq(Integer.class),
            any(), any(), any(), any(), any()))
            .thenReturn(0);
    }

    // ------------------------------------------------------------------ P-01

    @Test
    @DisplayName("P-01: Owner can always approve regardless of department structure")
    void ownerCanAlwaysApprove() {
        when(actor.owner()).thenReturn(true);
        when(actor.userId()).thenReturn(OWNER_USER_ID);

        assertThat(policy.canApprove(ORG_ID)).isTrue();
    }

    // ------------------------------------------------------------------ P-02

    @Test
    @DisplayName("P-02: Head of responsible department can approve")
    void responsibleHeadCanApprove() {
        when(actor.userId()).thenReturn(HEAD_USER_ID);
        // Responsible heads query returns head-001
        when(jdbc.queryForList(contains("FROM assignment"), eq(String.class),
            eq(ORG_ID), eq(ClassApprovalPolicy.MODULE_CODE),
            eq("Trưởng phòng"), eq("Trưởng phòng ban"), any(), any()))
            .thenReturn(List.of(HEAD_USER_ID));

        assertThat(policy.canApprove(ORG_ID)).isTrue();
    }

    // ------------------------------------------------------------------ P-03

    @Test
    @DisplayName("P-03: Active Tổng quản lý can approve (escalation path)")
    void activeGeneralManagerCanApprove() {
        when(actor.userId()).thenReturn(GM_USER_ID);
        // No responsible head
        when(jdbc.queryForList(contains("FROM assignment"), eq(String.class),
            eq(ORG_ID), eq(ClassApprovalPolicy.MODULE_CODE),
            eq("Trưởng phòng"), eq("Trưởng phòng ban"), any(), any()))
            .thenReturn(List.of());
        // GM check returns count=1
        when(jdbc.queryForObject(contains("p.scope='ORGANIZATION'"), eq(Integer.class),
            eq(ORG_ID), eq(GM_USER_ID),
            eq(GeneralManagerService.GENERAL_MANAGER_POSITION_NAME),
            any(), any()))
            .thenReturn(1);

        assertThat(policy.canApprove(ORG_ID)).isTrue();
    }

    // ------------------------------------------------------------------ P-04

    @Test
    @DisplayName("P-04: Regular staff cannot approve → CLASS_APPROVER_NOT_ALLOWED")
    void regularStaffCannotApprove() {
        when(actor.userId()).thenReturn(STAFF_USER_ID);
        // No heads, not a GM (default stubs in setUp)

        assertThatThrownBy(() -> policy.requireApprover(ORG_ID))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.CLASS_APPROVER_NOT_ALLOWED));
    }

    // ------------------------------------------------------------------ P-05

    @Test
    @DisplayName("P-05: Self-approval blocked even when user is an approver")
    void selfApprovalIsBlocked() {
        when(actor.userId()).thenReturn(HEAD_USER_ID);
        // Actor IS a responsible head
        when(jdbc.queryForList(contains("FROM assignment"), eq(String.class),
            eq(ORG_ID), eq(ClassApprovalPolicy.MODULE_CODE),
            eq("Trưởng phòng"), eq("Trưởng phòng ban"), any(), any()))
            .thenReturn(List.of(HEAD_USER_ID));

        // Self-approval: requester == actor
        assertThatThrownBy(() -> policy.requireApproverNotSelf(ORG_ID, HEAD_USER_ID))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.SELF_APPROVAL_NOT_ALLOWED));
    }

    // ------------------------------------------------------------------ P-06

    @Test
    @DisplayName("P-06: Approver is not blocked when requester is a different person")
    void approverAllowedWhenRequesterDiffers() {
        when(actor.userId()).thenReturn(HEAD_USER_ID);
        // Actor IS a responsible head
        when(jdbc.queryForList(contains("FROM assignment"), eq(String.class),
            eq(ORG_ID), eq(ClassApprovalPolicy.MODULE_CODE),
            eq("Trưởng phòng"), eq("Trưởng phòng ban"), any(), any()))
            .thenReturn(List.of(HEAD_USER_ID));

        // Different requester — no exception
        policy.requireApproverNotSelf(ORG_ID, REQUESTER_ID);
    }

    // ------------------------------------------------------------------ helpers
}
