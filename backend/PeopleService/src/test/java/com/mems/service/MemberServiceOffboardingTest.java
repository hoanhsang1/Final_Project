package com.mems.service;

import com.mems.client.IdentityClient;
import com.mems.dto.MemberResponse;
import com.mems.repository.DelegationRepository;
import com.mems.repository.DepartmentRepository;
import com.mems.repository.MemberRepository;
import com.mems.repository.PositionRepository;
import com.mems.repository.StaffProfileRepository;
import com.mems.repository.TeacherRepository;
import com.mems.security.Actor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.transaction.PlatformTransactionManager;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class MemberServiceOffboardingTest {

    private static final String ORG = "org-1";
    private static final String DEPT = "dept-1";
    private static final String USER = "emp-1";
    private static final String ACTOR_ID = "hr-1";

    private DepartmentRepository departments;
    private MemberRepository members;
    private MembershipPolicy policy;
    private IdentityClient identity;
    private TeacherRepository teachers;
    private DelegationRepository delegations;
    private PeopleAuditService audit;
    private Actor actor;
    private MemberService service;

    @BeforeEach
    void setUp() {
        departments = mock(DepartmentRepository.class);
        members = mock(MemberRepository.class);
        policy = mock(MembershipPolicy.class);
        identity = mock(IdentityClient.class);
        teachers = mock(TeacherRepository.class);
        delegations = mock(DelegationRepository.class);
        audit = mock(PeopleAuditService.class);
        actor = mock(Actor.class);

        service = new MemberService(departments, members, policy, identity,
            mock(AccountCompensationService.class), audit, actor,
            mock(StaffProfileRepository.class), teachers, mock(SpecialtyService.class),
            mock(PositionRepository.class), delegations, mock(PlatformTransactionManager.class));

        when(actor.orgId()).thenReturn(ORG);
        when(actor.userId()).thenReturn(ACTOR_ID);
        when(members.require(USER, ORG, DEPT, true)).thenReturn(new MemberResponse(
            USER, "emp.user", DEPT, "STAFF", "ACTIVE", ACTOR_ID, Instant.now(),
            Set.of(), Set.of()));
        when(delegations.revokeAllForDelegate(ORG, USER, ACTOR_ID, "Gỡ nhân sự"))
            .thenReturn(List.of("delegation-1"));
    }

    @Test
    @DisplayName("HR-01: gỡ nhân sự là offboarding mềm, không xoá cứng hồ sơ")
    void removeOffboardsInsteadOfHardDelete() {
        service.remove(DEPT, USER);

        verify(members).offboard(USER, ORG, ACTOR_ID, "Gỡ nhân sự");
        verify(teachers).markResigned(USER, ORG);
        verify(delegations).revokeAllForDelegate(ORG, USER, ACTOR_ID, "Gỡ nhân sự");
        verify(audit).record(eq(ORG), eq(ACTOR_ID), eq("DELEGATION_REVOKED"),
            eq("delegation-1"), any());
        verify(identity).disableAccount(USER, ORG);
        verify(audit).record(eq(ORG), eq(ACTOR_ID), eq("MEMBER_REMOVED"), eq(USER), any());

        InOrder order = inOrder(members, identity);
        order.verify(members).offboard(USER, ORG, ACTOR_ID, "Gỡ nhân sự");
        order.verify(identity).disableAccount(USER, ORG);
    }

    @Test
    @DisplayName("HR-01: gỡ nhân sự vẫn kiểm quyền employee.delete trước khi đụng dữ liệu")
    void removeRequiresPermissionFirst() {
        doThrow(new com.mems.exception.AppException(com.mems.exception.ErrorCode.FORBIDDEN, "denied"))
            .when(policy).requirePermission(DEPT, "employee.delete");

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.remove(DEPT, USER))
            .isInstanceOf(com.mems.exception.AppException.class);

        verify(members, never()).offboard(anyString(), anyString(), anyString(), anyString());
        verifyNoInteractions(identity);
    }
}
