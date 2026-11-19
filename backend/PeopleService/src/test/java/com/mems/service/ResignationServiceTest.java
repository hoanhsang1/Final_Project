package com.mems.service;

import com.mems.client.IdentityClient;
import com.mems.dto.MemberResponse;
import com.mems.dto.ResignationCreateRequest;
import com.mems.dto.ResignationDecisionRequest;
import com.mems.dto.ResignationResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.DelegationRepository;
import com.mems.repository.DepartmentRepository;
import com.mems.repository.MemberRepository;
import com.mems.repository.ResignationRepository;
import com.mems.repository.TeacherRepository;
import com.mems.security.Actor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import java.time.Instant;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ResignationServiceTest {

    private static final String ORG = "org-1";
    private static final String DEPT = "dept-1";
    private static final String REQUEST_ID = "request-1";
    private static final String REQUESTER = "hr-requester";
    private static final String EMPLOYEE = "emp-1";
    private static final String APPROVER = "approver-1";

    private Actor actor;
    private MembershipPolicy membership;
    private DepartmentRepository departments;
    private MemberRepository members;
    private ResignationRepository requests;
    private TeacherRepository teachers;
    private IdentityClient identity;
    private PeopleAuditService audit;
    private TeacherOffboardingHook offboarding;
    private ResignationApprovalPolicy approval;
    private NotificationService notifications;
    private DelegationRepository delegations;
    private ResignationService service;

    @BeforeEach
    void setUp() {
        actor = mock(Actor.class);
        membership = mock(MembershipPolicy.class);
        departments = mock(DepartmentRepository.class);
        members = mock(MemberRepository.class);
        requests = mock(ResignationRepository.class);
        teachers = mock(TeacherRepository.class);
        identity = mock(IdentityClient.class);
        audit = mock(PeopleAuditService.class);
        offboarding = mock(TeacherOffboardingHook.class);
        approval = mock(ResignationApprovalPolicy.class);
        notifications = mock(NotificationService.class);
        delegations = mock(DelegationRepository.class);
        when(delegations.revokeAllForDelegate(anyString(), anyString(), anyString(), anyString()))
            .thenReturn(java.util.List.of());

        service = new ResignationService(actor, membership, departments, members, requests,
            teachers, identity, audit, offboarding, approval, notifications, delegations);

        when(actor.orgId()).thenReturn(ORG);
        when(actor.userId()).thenReturn(APPROVER);
        when(requests.requireForUpdate(REQUEST_ID, ORG, DEPT)).thenReturn(pending());
        when(requests.require(anyString(), anyString(), anyString())).thenReturn(pending());
        when(members.require(EMPLOYEE, ORG, DEPT, true)).thenReturn(new MemberResponse(
            EMPLOYEE, "emp.user", DEPT, "STAFF", "ACTIVE", APPROVER, Instant.now(),
            Set.of(), Set.of()));
        when(teachers.activeClassCount(EMPLOYEE, ORG)).thenReturn(2L);
    }

    @Test
    @DisplayName("Approve delegates the approver check to the escalation policy")
    void approveUsesEscalationPolicy() {
        when(delegations.revokeAllForDelegate(ORG, EMPLOYEE, APPROVER, "Nhân sự nghỉ việc"))
            .thenReturn(java.util.List.of("delegation-1"));

        service.approve(DEPT, REQUEST_ID, new ResignationDecisionRequest("Đồng ý"));

        verify(approval).requireApprover(ORG, DEPT, REQUESTER, EMPLOYEE);
        verify(delegations).revokeAllForDelegate(ORG, EMPLOYEE, APPROVER, "Nhân sự nghỉ việc");
        verify(audit).record(eq(ORG), eq(APPROVER), eq("DELEGATION_REVOKED"),
            eq("delegation-1"), any());
        verify(identity).disableAccount(EMPLOYEE, ORG);
        verify(members).revokeAll(EMPLOYEE, ORG, APPROVER, "Nghỉ việc: Lý do");
        verify(members).markResigned(EMPLOYEE, ORG);
        verify(teachers).markResigned(EMPLOYEE, ORG);
        verify(offboarding).teacherNeedsReassignment(ORG, EMPLOYEE, 2L);
        verify(requests).decide(REQUEST_ID, "APPROVED", APPROVER, "Đồng ý");
        verify(notifications, atLeastOnce()).notify(eq(ORG), eq(REQUESTER),
            eq("RESIGNATION_APPROVED"), anyString(), contains("emp.user"),
            eq("RESIGNATION_REQUEST"), eq(REQUEST_ID));

        InOrder order = inOrder(members, requests, identity);
        order.verify(members).markResigned(EMPLOYEE, ORG);
        order.verify(requests).decide(REQUEST_ID, "APPROVED", APPROVER, "Đồng ý");
        order.verify(identity).disableAccount(EMPLOYEE, ORG);
    }

    @Test
    @DisplayName("Self-approval aborts before any account or member mutation")
    void selfApprovalAbortsBeforeMutation() {
        doThrow(new AppException(ErrorCode.SELF_APPROVAL_NOT_ALLOWED))
            .when(approval).requireApprover(ORG, DEPT, REQUESTER, EMPLOYEE);

        assertThatThrownBy(() -> service.approve(DEPT, REQUEST_ID, new ResignationDecisionRequest(null)))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> org.assertj.core.api.Assertions.assertThat(
                ((AppException) ex).getErrorCode()).isEqualTo(ErrorCode.SELF_APPROVAL_NOT_ALLOWED));

        verifyNoInteractions(identity);
        verify(requests, never()).decide(anyString(), anyString(), anyString(), any());
        verify(members, never()).markResigned(anyString(), anyString());
    }

    @Test
    @DisplayName("Reject uses the same escalation policy and never mutates the member")
    void rejectUsesEscalationPolicy() {
        service.reject(DEPT, REQUEST_ID, new ResignationDecisionRequest("Chưa duyệt"));

        verify(approval).requireApprover(ORG, DEPT, REQUESTER, EMPLOYEE);
        verify(requests).decide(REQUEST_ID, "REJECTED", APPROVER, "Chưa duyệt");
        verify(notifications).notify(eq(ORG), eq(REQUESTER), eq("RESIGNATION_REJECTED"),
            anyString(), eq("Chưa duyệt"), eq("RESIGNATION_REQUEST"), eq(REQUEST_ID));
        verify(notifications).notify(eq(ORG), eq(EMPLOYEE), eq("RESIGNATION_REJECTED"),
            anyString(), eq("Chưa duyệt"), eq("RESIGNATION_REQUEST"), eq(REQUEST_ID));
        verifyNoInteractions(identity);
        verify(members, never()).markResigned(anyString(), anyString());
    }

    @Test
    @DisplayName("Reject is blocked when no valid approver remains")
    void rejectBlockedWithoutValidApprover() {
        doThrow(new AppException(ErrorCode.RESIGNATION_APPROVER_NOT_ALLOWED))
            .when(approval).requireApprover(ORG, DEPT, REQUESTER, EMPLOYEE);

        assertThatThrownBy(() -> service.reject(DEPT, REQUEST_ID, new ResignationDecisionRequest(null)))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> org.assertj.core.api.Assertions.assertThat(
                ((AppException) ex).getErrorCode()).isEqualTo(ErrorCode.RESIGNATION_APPROVER_NOT_ALLOWED));

        verify(requests, never()).decide(anyString(), anyString(), anyString(), any());
    }

    @Test
    @DisplayName("Create notifies approvers and audits the request")
    void createNotifiesApprovers() {
        when(approval.approverIds(ORG, DEPT, APPROVER, EMPLOYEE)).thenReturn(Set.of("head-1"));
        when(requests.require(anyString(), eq(ORG), eq(DEPT))).thenReturn(pending());

        service.create(DEPT, new ResignationCreateRequest(EMPLOYEE, "Lý do"));

        verify(requests).create(anyString(), eq(ORG), eq(EMPLOYEE), eq(DEPT), eq("Lý do"), eq(APPROVER));
        verify(audit).record(eq(ORG), eq(APPROVER), eq("RESIGNATION_REQUESTED"), eq(EMPLOYEE), any());
        verify(notifications).notifyAll(eq(ORG), eq(Set.of("head-1")),
            eq("RESIGNATION_REQUESTED"), anyString(), contains("Lý do"),
            eq("RESIGNATION_REQUEST"), anyString());
    }

    @Test
    @DisplayName("Self-service list only returns the caller's own requests")
    void mineListsOnlyOwnRequests() {
        when(requests.mine(ORG, APPROVER, null)).thenReturn(java.util.List.of(pending()));

        var result = service.mine(null);

        org.assertj.core.api.Assertions.assertThat(result).hasSize(1);
        verify(requests).mine(ORG, APPROVER, null);
    }

    @Test
    @DisplayName("Self-service create resolves the caller's department and cannot target another user")
    void createSelfUsesCallerIdentity() {
        when(members.findDepartmentId(APPROVER, ORG)).thenReturn(java.util.Optional.of(DEPT));
        when(members.require(APPROVER, ORG, DEPT, true)).thenReturn(new MemberResponse(
            APPROVER, "self.user", DEPT, "STAFF", "ACTIVE", null, Instant.now(),
            Set.of(), Set.of()));
        when(approval.approverIds(ORG, DEPT, APPROVER, APPROVER)).thenReturn(Set.of("head-1"));

        service.createSelf(new ResignationCreateRequest(APPROVER, "Lý do cá nhân"));

        verify(requests).create(anyString(), eq(ORG), eq(APPROVER), eq(DEPT),
            eq("Lý do cá nhân"), eq(APPROVER));
    }

    @Test
    @DisplayName("Self-service create rejects a request for someone else")
    void createSelfRejectsOtherUser() {
        when(actor.forbidden(anyString())).thenReturn(new AppException(ErrorCode.FORBIDDEN));

        assertThatThrownBy(() -> service.createSelf(new ResignationCreateRequest(EMPLOYEE, "Lý do")))
            .isInstanceOf(AppException.class);

        verify(members, never()).findDepartmentId(anyString(), anyString());
        verify(requests, never()).create(anyString(), anyString(), anyString(), anyString(),
            anyString(), anyString());
    }

    @Test
    @DisplayName("Hộp duyệt chỉ trả yêu cầu PENDING mà policy xác nhận có thẩm quyền")
    void inboxFiltersByApprovalPolicyWithoutListPermissions() {
        var approvable = pending();
        var notApprovable = new ResignationResponse("request-2", "emp-2", "emp2.user", "Nhân viên 2",
            "dept-2", "Lý do 2", "PENDING", "hr-2", "Người yêu cầu 2", Instant.now(),
            null, null, null, "Phòng 2", null);
        when(requests.listOrg(ORG, "PENDING")).thenReturn(java.util.List.of(approvable, notApprovable));
        when(approval.canApprove(ORG, DEPT, REQUESTER, EMPLOYEE)).thenReturn(true);
        when(approval.canApprove(ORG, "dept-2", "hr-2", "emp-2")).thenReturn(false);

        var result = service.inbox(null);

        org.assertj.core.api.Assertions.assertThat(result).containsExactly(approvable);
        verify(requests).listOrg(ORG, "PENDING");
        verifyNoInteractions(membership, departments);
    }

    private ResignationResponse pending() {
        return new ResignationResponse(REQUEST_ID, EMPLOYEE, "emp.user", "Nhân viên", DEPT,
            "Lý do", "PENDING", REQUESTER, "Người yêu cầu", Instant.now(),
            null, null, null, "Phòng 1", null);
    }
}
