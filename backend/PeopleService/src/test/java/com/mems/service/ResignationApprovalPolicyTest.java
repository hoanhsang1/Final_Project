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
    private static final String EMPLOYEE = "emp-1";
    private static final String HR = "hr-1";
    private static final String HEAD = "head-1";
    private static final String OTHER_HEAD = "head-other-dept";
    private static final String GM = "gm-1";
    private static final String OWNER = "owner-1";

    private JdbcTemplate jdbc;
    private Actor actor;
    private EffectivePermissionsService effectivePermissions;
    private ResignationApprovalPolicy policy;

    @BeforeEach
    void setUp() {
        jdbc = mock(JdbcTemplate.class);
        actor = mock(Actor.class);
        effectivePermissions = mock(EffectivePermissionsService.class);
        policy = new ResignationApprovalPolicy(jdbc, actor, effectivePermissions);

        when(actor.userId()).thenReturn(HR);
        when(actor.owner()).thenReturn(false);
        when(jdbc.queryForList(contains("FROM department_member"), eq(String.class), eq(ORG)))
            .thenReturn(List.of(REQUESTER, EMPLOYEE));
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
    @DisplayName("HR with a position-derived permission may approve when not requester/subject")
    void hrWithPermissionCanApprove() {
        stubMembers(REQUESTER, EMPLOYEE, HR);
        stubDirectPermission(HR);

        policy.requireApprover(ORG, DEPT, REQUESTER, EMPLOYEE);
    }

    @Test
    @DisplayName("The requester can never approve their own resignation")
    void requesterCannotApproveOwnRequest() {
        when(actor.userId()).thenReturn(REQUESTER);
        stubMembers(REQUESTER, EMPLOYEE);
        stubDirectPermission(REQUESTER);

        assertThatThrownBy(() -> policy.requireApprover(ORG, DEPT, REQUESTER, EMPLOYEE))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.SELF_APPROVAL_NOT_ALLOWED));
    }

    @Test
    @DisplayName("The employee cannot approve their own resignation when HR created the request")
    void subjectCannotApproveWhenSomeoneElseRequested() {
        when(actor.userId()).thenReturn(EMPLOYEE);
        stubMembers(REQUESTER, EMPLOYEE, HEAD);
        stubHeads(EMPLOYEE);

        assertThatThrownBy(() -> policy.requireApprover(ORG, DEPT, REQUESTER, EMPLOYEE))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.SELF_APPROVAL_NOT_ALLOWED));
    }

    @Test
    @DisplayName("Owner cannot approve their own request either")
    void ownerCannotApproveOwnRequest() {
        when(actor.userId()).thenReturn(OWNER);
        when(actor.owner()).thenReturn(true);

        assertThatThrownBy(() -> policy.requireApprover(ORG, DEPT, OWNER, OWNER))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.SELF_APPROVAL_NOT_ALLOWED));
    }

    @Test
    @DisplayName("When the only HR is the requester, the department head can approve")
    void headApprovesWhenOnlyHrIsRequester() {
        when(actor.userId()).thenReturn(HEAD);
        stubMembers(REQUESTER, EMPLOYEE, HEAD);
        stubHeads(HEAD);

        policy.requireApprover(ORG, DEPT, REQUESTER, EMPLOYEE);
        assertThat(policy.headIds(ORG, DEPT)).contains(HEAD);
    }

    @Test
    @DisplayName("A head from another department cannot approve")
    void otherDepartmentHeadCannotApprove() {
        when(actor.userId()).thenReturn(OTHER_HEAD);
        stubMembers(REQUESTER, EMPLOYEE, OTHER_HEAD);
        stubHeads(HEAD);

        assertThatThrownBy(() -> policy.requireApprover(ORG, DEPT, REQUESTER, EMPLOYEE))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.RESIGNATION_APPROVER_NOT_ALLOWED));
    }

    @Test
    @DisplayName("When no eligible HR and no head, a delegated GM can approve")
    void delegatedGeneralManagerApprovesWhenNoHrOrHead() {
        when(actor.userId()).thenReturn(GM);
        stubMembers(REQUESTER, EMPLOYEE, GM);
        stubGeneralManager(true);

        policy.requireApprover(ORG, DEPT, REQUESTER, EMPLOYEE);
    }

    @Test
    @DisplayName("A GM appointment without delegation is not enough")
    void generalManagerWithoutDelegationIsRejected() {
        when(actor.userId()).thenReturn(GM);
        stubMembers(REQUESTER, EMPLOYEE, GM);
        stubGeneralManager(false);

        assertThatThrownBy(() -> policy.requireApprover(ORG, DEPT, REQUESTER, EMPLOYEE))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.RESIGNATION_APPROVER_NOT_ALLOWED));
    }

    @Test
    @DisplayName("Delegated GM cannot skip an HR permission holder")
    void delegatedGeneralManagerCannotSkipHr() {
        when(actor.userId()).thenReturn(GM);
        stubMembers(REQUESTER, EMPLOYEE, HR, GM);
        stubDirectPermission(HR);
        stubGeneralManager(true);

        assertThatThrownBy(() -> policy.requireApprover(ORG, DEPT, REQUESTER, EMPLOYEE))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.RESIGNATION_APPROVER_NOT_ALLOWED));
    }

    @Test
    @DisplayName("A head cannot skip a different HR who holds the permission")
    void headCannotSkipAnotherHr() {
        when(actor.userId()).thenReturn(HEAD);
        stubMembers(REQUESTER, EMPLOYEE, HR, HEAD);
        stubDirectPermission(HR);
        stubHeads(HEAD);

        assertThatThrownBy(() -> policy.requireApprover(ORG, DEPT, REQUESTER, EMPLOYEE))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.RESIGNATION_APPROVER_NOT_ALLOWED));
    }

    @Test
    @DisplayName("A delegated GM in the department does not block the head")
    void delegatedGeneralManagerDoesNotBlockHead() {
        when(actor.userId()).thenReturn(HEAD);
        stubMembers(REQUESTER, EMPLOYEE, GM, HEAD);
        when(effectivePermissions.resolve(ORG, GM, DEPT))
            .thenReturn(new EffectivePermissionsService.EffectivePermissions(
                Set.of(ResignationApprovalPolicy.APPROVE_PERMISSION), Map.of(),
                Set.of(ResignationApprovalPolicy.APPROVE_PERMISSION)));
        stubHeads(HEAD);

        policy.requireApprover(ORG, DEPT, REQUESTER, EMPLOYEE);
    }

    @Test
    @DisplayName("A delegated GM cannot skip a department head who is still eligible")
    void delegatedGeneralManagerCannotSkipEligibleHead() {
        when(actor.userId()).thenReturn(GM);
        stubMembers(REQUESTER, EMPLOYEE, GM, HEAD);
        stubHeads(HEAD);
        stubGeneralManager(true);

        assertThatThrownBy(() -> policy.requireApprover(ORG, DEPT, REQUESTER, EMPLOYEE))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.RESIGNATION_APPROVER_NOT_ALLOWED));
    }

    @Test
    @DisplayName("A head who is the requester does not block the delegated GM level")
    void requesterHeadDoesNotBlockDelegatedGeneralManager() {
        when(actor.userId()).thenReturn(GM);
        stubMembers(REQUESTER, EMPLOYEE, GM, HEAD);
        stubHeads(REQUESTER);
        stubGeneralManager(true);

        policy.requireApprover(ORG, DEPT, REQUESTER, EMPLOYEE);
    }

    @Test
    @DisplayName("A second HR holder approves at level 1 before the head is considered")
    void secondHrApprovesBeforeHead() {
        String hr2 = "hr-2";
        when(actor.userId()).thenReturn(hr2);
        stubMembers(REQUESTER, EMPLOYEE, HR, hr2, HEAD);
        stubDirectPermission(hr2);
        stubHeads(HEAD);

        policy.requireApprover(ORG, DEPT, REQUESTER, EMPLOYEE);
    }

    @Test
    @DisplayName("An expired delegation grants nothing to the GM")
    void expiredDelegationIsRejected() {
        when(actor.userId()).thenReturn(GM);
        stubMembers(REQUESTER, EMPLOYEE, GM);
        stubGeneralManager(false);

        assertThatThrownBy(() -> policy.requireApprover(ORG, DEPT, REQUESTER, EMPLOYEE))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.RESIGNATION_APPROVER_NOT_ALLOWED));
    }

    @Test
    @DisplayName("Owner is the final level and always allowed when not requester/subject")
    void ownerCanApproveAtFinalLevel() {
        when(actor.userId()).thenReturn(OWNER);
        when(actor.owner()).thenReturn(true);

        policy.requireApprover(ORG, DEPT, REQUESTER, EMPLOYEE);
    }

    @Test
    @DisplayName("Notification recipients exclude requester and subject")
    void approverIdsExcludeRequesterAndSubject() {
        stubMembers(REQUESTER, EMPLOYEE, HR);
        stubDirectPermission(HR);
        stubHeads(HEAD);

        assertThat(policy.approverIds(ORG, DEPT, REQUESTER, EMPLOYEE))
            .containsExactlyInAnyOrder(HR, HEAD);
    }

    @Test
    @DisplayName("canApprove=true cho HR giữ quyền trực tiếp, false cho người ngoài cuộc")
    void canApproveReflectsEscalationWithoutThrowing() {
        stubMembers(REQUESTER, EMPLOYEE, HR, "outsider");
        stubDirectPermission(HR);

        assertThat(policy.canApprove(ORG, DEPT, REQUESTER, EMPLOYEE)).isTrue();

        when(actor.userId()).thenReturn("outsider");
        assertThat(policy.canApprove(ORG, DEPT, REQUESTER, EMPLOYEE)).isFalse();
    }

    @Test
    @DisplayName("canApprove=false cho chính người yêu cầu hoặc người xin nghỉ")
    void canApproveIsFalseForRequesterAndSubject() {
        stubMembers(REQUESTER, EMPLOYEE, HEAD);
        stubHeads(HEAD);

        when(actor.userId()).thenReturn(REQUESTER);
        assertThat(policy.canApprove(ORG, DEPT, REQUESTER, EMPLOYEE)).isFalse();

        when(actor.userId()).thenReturn(EMPLOYEE);
        // Trưởng phòng khác vẫn tồn tại nên subject cũng không nhảy cấp.
        assertThat(policy.canApprove(ORG, DEPT, REQUESTER, EMPLOYEE)).isFalse();
    }

    @Test
    @DisplayName("canApprove=true cho GM có uỷ quyền khi không còn HR/trưởng phòng")
    void canApproveAllowsDelegatedGeneralManager() {
        when(actor.userId()).thenReturn(GM);
        stubMembers(REQUESTER, EMPLOYEE, GM);
        stubGeneralManager(true);

        assertThat(policy.canApprove(ORG, DEPT, REQUESTER, EMPLOYEE)).isTrue();
    }

    private void stubMembers(String... userIds) {
        when(jdbc.queryForList(contains("FROM department_member"), eq(String.class), eq(ORG)))
            .thenReturn(List.of(userIds));
    }

    private void stubDirectPermission(String userId) {
        when(effectivePermissions.resolve(ORG, userId, DEPT))
            .thenReturn(new EffectivePermissionsService.EffectivePermissions(
                Set.of(ResignationApprovalPolicy.APPROVE_PERMISSION), Map.of()));
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
