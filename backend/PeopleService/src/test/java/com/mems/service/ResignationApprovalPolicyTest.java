package com.mems.service;

import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.security.Actor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * DEC-08 escalation tests: HR permission → department head → delegated GM → owner.
 */
class ResignationApprovalPolicyTest {

    private static final String ORG = "org-1";
    private static final String DEPT = "dept-1";
    private static final String REQUESTER = "requester-1";
    private static final String HR = "hr-1";
    private static final String HEAD = "head-1";
    private static final String GM = "gm-1";
    private static final String OWNER = "owner-1";

    private JdbcTemplate jdbc;
    private Actor actor;
    private MembershipPolicy membership;
    private EffectivePermissionsService effectivePermissions;
    private ResignationApprovalPolicy policy;

    @BeforeEach
    void setUp() {
        jdbc = mock(JdbcTemplate.class);
        actor = mock(Actor.class);
        membership = mock(MembershipPolicy.class);
        effectivePermissions = mock(EffectivePermissionsService.class);
        policy = new ResignationApprovalPolicy(jdbc, actor, membership, effectivePermissions);

        when(actor.userId()).thenReturn(HR);
        when(actor.owner()).thenReturn(false);
        when(membership.hasPermission(DEPT, ResignationApprovalPolicy.APPROVE_PERMISSION))
            .thenReturn(false);
        when(jdbc.queryForList(contains("FROM department_member"), eq(String.class), eq(ORG), eq(DEPT)))
            .thenReturn(List.of(REQUESTER));
        when(jdbc.queryForList(contains("FROM assignment"), eq(String.class), any()))
            .thenReturn(List.of());
        when(jdbc.queryForObject(contains("p.scope='ORGANIZATION'"), eq(Integer.class),
            any(), any(), any(), any(), any()))
            .thenReturn(0);
        when(effectivePermissions.activeDelegationGrants(any(), any())).thenReturn(Map.of());
        when(effectivePermissions.resolve(any(), any(), any()))
            .thenReturn(new EffectivePermissionsService.EffectivePermissions(Set.of(), Map.of()));
    }

    @Test
    @DisplayName("HR with permission may approve when not the requester")
    void hrWithPermissionCanApprove() {
        when(membership.hasPermission(DEPT, ResignationApprovalPolicy.APPROVE_PERMISSION))
            .thenReturn(true);

        policy.requireApprover(ORG, DEPT, REQUESTER);
    }

    @Test
    @DisplayName("The requester can never approve their own resignation")
    void requesterCannotApproveOwnRequest() {
        when(actor.userId()).thenReturn(REQUESTER);
        when(membership.hasPermission(DEPT, ResignationApprovalPolicy.APPROVE_PERMISSION))
            .thenReturn(true);

        assertThatThrownBy(() -> policy.requireApprover(ORG, DEPT, REQUESTER))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.SELF_APPROVAL_NOT_ALLOWED));
    }

    @Test
    @DisplayName("Owner cannot approve their own request either")
    void ownerCannotApproveOwnRequest() {
        when(actor.userId()).thenReturn(OWNER);
        when(actor.owner()).thenReturn(true);

        assertThatThrownBy(() -> policy.requireApprover(ORG, DEPT, OWNER))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.SELF_APPROVAL_NOT_ALLOWED));
    }

    @Test
    @DisplayName("When the only HR is the requester, the department head can approve")
    void headApprovesWhenOnlyHrIsRequester() {
        when(actor.userId()).thenReturn(HEAD);
        stubHeads(HEAD);

        policy.requireApprover(ORG, DEPT, REQUESTER);
        assertThat(policy.headIds(ORG, DEPT)).contains(HEAD);
    }

    @Test
    @DisplayName("When no eligible HR and no head, a delegated GM can approve")
    void delegatedGeneralManagerApprovesWhenNoHrOrHead() {
        when(actor.userId()).thenReturn(GM);
        stubGeneralManager(true);

        policy.requireApprover(ORG, DEPT, REQUESTER);
    }

    @Test
    @DisplayName("A GM appointment without delegation is not enough")
    void generalManagerWithoutDelegationIsRejected() {
        when(actor.userId()).thenReturn(GM);
        stubGeneralManager(false);

        assertThatThrownBy(() -> policy.requireApprover(ORG, DEPT, REQUESTER))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.RESIGNATION_APPROVER_NOT_ALLOWED));
    }

    @Test
    @DisplayName("A head cannot skip a different HR who holds the permission")
    void headCannotSkipAnotherHr() {
        when(actor.userId()).thenReturn(HEAD);
        when(jdbc.queryForList(contains("FROM department_member"), eq(String.class), eq(ORG), eq(DEPT)))
            .thenReturn(List.of(REQUESTER, HR));
        when(effectivePermissions.resolve(ORG, HR, DEPT))
            .thenReturn(new EffectivePermissionsService.EffectivePermissions(
                Set.of(ResignationApprovalPolicy.APPROVE_PERMISSION), Map.of()));
        stubHeads(HEAD);

        assertThatThrownBy(() -> policy.requireApprover(ORG, DEPT, REQUESTER))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.RESIGNATION_APPROVER_NOT_ALLOWED));
    }

    @Test
    @DisplayName("Owner is the final level and always allowed when not the requester")
    void ownerCanApproveAtFinalLevel() {
        when(actor.userId()).thenReturn(OWNER);
        when(actor.owner()).thenReturn(true);

        policy.requireApprover(ORG, DEPT, REQUESTER);
    }

    private void stubHeads(String... userIds) {
        when(jdbc.queryForList(contains("FROM assignment"), eq(String.class),
            eq(ORG), eq(DEPT), eq("Trưởng phòng"), eq("Trưởng phòng ban"), any(), any()))
            .thenReturn(List.of(userIds));
    }

    private void stubGeneralManager(boolean delegated) {
        when(jdbc.queryForObject(contains("p.scope='ORGANIZATION'"), eq(Integer.class),
            eq(ORG), eq(GM), eq(GeneralManagerService.GENERAL_MANAGER_POSITION_NAME), any(), any()))
            .thenReturn(1);
        when(effectivePermissions.activeDelegationGrants(ORG, GM))
            .thenReturn(delegated
                ? Map.of(ResignationApprovalPolicy.APPROVE_PERMISSION, "delegation-1")
                : Map.of());
    }
}
