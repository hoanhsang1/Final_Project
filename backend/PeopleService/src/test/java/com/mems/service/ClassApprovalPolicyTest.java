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
 * Unit tests for {@link ClassApprovalPolicy} (kế hoạch v2 §1.5).
 *
 * <p>Escalation order: responsible head → delegated general manager → owner.
 * A higher level only acts when no eligible lower level exists.</p>
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

        when(actor.owner()).thenReturn(false);
        when(jdbc.queryForList(contains("FROM assignment"), eq(String.class), any()))
            .thenReturn(List.of());
        when(jdbc.queryForObject(contains("p.scope='ORGANIZATION'"), eq(Integer.class),
            any(), any(), any(), any(), any()))
            .thenReturn(0);
        when(jdbc.queryForObject(contains("FROM delegation d"), eq(Integer.class),
            any(), any(), any(), any()))
            .thenReturn(0);
    }

    // ------------------------------------------------------------------ P-01

    @Test
    @DisplayName("P-01: Owner can approve regardless of department structure")
    void ownerCanAlwaysApprove() {
        when(actor.owner()).thenReturn(true);
        when(actor.userId()).thenReturn(OWNER_USER_ID);

        assertThat(policy.canApprove(ORG_ID)).isTrue();
    }

    @Test
    @DisplayName("P-01b: Owner still cannot approve their own request")
    void ownerCannotApproveOwnRequest() {
        when(actor.owner()).thenReturn(true);
        when(actor.userId()).thenReturn(OWNER_USER_ID);

        assertThatThrownBy(() -> policy.requireApprover(ORG_ID, OWNER_USER_ID))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.SELF_APPROVAL_NOT_ALLOWED));
    }

    // ------------------------------------------------------------------ P-02

    @Test
    @DisplayName("P-02: Head of responsible department can approve")
    void responsibleHeadCanApprove() {
        when(actor.userId()).thenReturn(HEAD_USER_ID);
        stubHeads(HEAD_USER_ID);

        assertThat(policy.canApprove(ORG_ID, REQUESTER_ID)).isTrue();
    }

    // ------------------------------------------------------------------ P-03

    @Test
    @DisplayName("P-03: Delegated general manager approves when no eligible head exists")
    void delegatedGeneralManagerCanApprove() {
        when(actor.userId()).thenReturn(GM_USER_ID);
        stubHeads();
        stubGeneralManager(GM_USER_ID, true);

        assertThat(policy.canApprove(ORG_ID, REQUESTER_ID)).isTrue();
    }

    @Test
    @DisplayName("P-03b: General manager appointed without delegation cannot approve")
    void generalManagerWithoutDelegationCannotApprove() {
        when(actor.userId()).thenReturn(GM_USER_ID);
        stubHeads();
        stubGeneralManager(GM_USER_ID, false);

        assertThat(policy.canApprove(ORG_ID, REQUESTER_ID)).isFalse();
    }

    // ------------------------------------------------------------------ P-04

    @Test
    @DisplayName("P-04: Regular staff cannot approve → CLASS_APPROVER_NOT_ALLOWED")
    void regularStaffCannotApprove() {
        when(actor.userId()).thenReturn(STAFF_USER_ID);

        assertThatThrownBy(() -> policy.requireApprover(ORG_ID, REQUESTER_ID))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.CLASS_APPROVER_NOT_ALLOWED));
    }

    // ------------------------------------------------------------------ P-05

    @Test
    @DisplayName("P-05: Self-approval blocked even when user is an approver")
    void selfApprovalIsBlocked() {
        when(actor.userId()).thenReturn(HEAD_USER_ID);
        stubHeads(HEAD_USER_ID);

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
        stubHeads(HEAD_USER_ID);

        policy.requireApproverNotSelf(ORG_ID, REQUESTER_ID);
    }

    // ------------------------------------------------------------------ P-07

    @Test
    @DisplayName("P-07: GM cannot skip an available head (escalation order)")
    void generalManagerCannotSkipAvailableHead() {
        when(actor.userId()).thenReturn(GM_USER_ID);
        stubHeads(HEAD_USER_ID);
        stubGeneralManager(GM_USER_ID, true);

        assertThat(policy.canApprove(ORG_ID, REQUESTER_ID)).isFalse();
    }

    // ------------------------------------------------------------------ P-08

    @Test
    @DisplayName("P-08: GM can approve when the only head is the requester")
    void generalManagerApprovesWhenHeadIsRequester() {
        when(actor.userId()).thenReturn(GM_USER_ID);
        stubHeads(HEAD_USER_ID);
        stubGeneralManager(GM_USER_ID, true);

        assertThat(policy.canApprove(ORG_ID, HEAD_USER_ID)).isTrue();
    }

    // ------------------------------------------------------------------ P-09

    @Test
    @DisplayName("P-09: Head who created the request cannot approve it")
    void headWhoCreatedRequestCannotApprove() {
        when(actor.userId()).thenReturn(HEAD_USER_ID);
        stubHeads(HEAD_USER_ID);

        assertThat(policy.canApprove(ORG_ID, HEAD_USER_ID)).isFalse();
    }

    // ------------------------------------------------------------------ helpers

    private void stubHeads(String... userIds) {
        when(jdbc.queryForList(contains("FROM assignment"), eq(String.class),
            eq(ORG_ID), eq(ClassApprovalPolicy.MODULE_CODE),
            eq("Trưởng phòng"), eq("Trưởng phòng ban"), any(), any()))
            .thenReturn(List.of(userIds));
    }

    private void stubGeneralManager(String userId, boolean delegated) {
        when(jdbc.queryForObject(contains("p.scope='ORGANIZATION'"), eq(Integer.class),
            eq(ORG_ID), eq(userId),
            eq(GeneralManagerService.GENERAL_MANAGER_POSITION_NAME),
            any(), any()))
            .thenReturn(1);
        when(jdbc.queryForObject(contains("FROM delegation d"), eq(Integer.class),
            eq(ORG_ID), eq(userId), any(), any()))
            .thenReturn(delegated ? 1 : 0);
    }
}
