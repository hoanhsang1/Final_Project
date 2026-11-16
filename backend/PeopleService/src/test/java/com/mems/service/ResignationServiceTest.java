package com.mems.service;

import com.mems.client.IdentityClient;
import com.mems.dto.MemberResponse;
import com.mems.dto.ResignationCreateRequest;
import com.mems.dto.ResignationDecisionRequest;
import com.mems.dto.ResignationResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.DepartmentRepository;
import com.mems.repository.MemberRepository;
import com.mems.repository.ResignationRepository;
import com.mems.repository.TeacherRepository;
import com.mems.security.Actor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

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

        service = new ResignationService(actor, membership, departments, members, requests,
            teachers, identity, audit, offboarding, approval, notifications);

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
        service.approve(DEPT, REQUEST_ID, new ResignationDecisionRequest("Đồng ý"));

        verify(approval).requireApprover(ORG, DEPT, REQUESTER, EMPLOYEE);
        verify(identity).disableAccount(EMPLOYEE, ORG);
        verify(members).revokeAll(EMPLOYEE, ORG, APPROVER, "Nghỉ việc: Lý do");
        verify(members).markResigned(EMPLOYEE, ORG);
        verify(teachers).markResigned(EMPLOYEE, ORG);
        verify(offboarding).teacherNeedsReassignment(ORG, EMPLOYEE, 2L);
        verify(requests).decide(REQUEST_ID, "APPROVED", APPROVER, "Đồng ý");
        verify(notifications, atLeastOnce()).notify(eq(ORG), eq(REQUESTER),
            eq("RESIGNATION_APPROVED"), anyString(), anyString(),
            eq("RESIGNATION_REQUEST"), eq(REQUEST_ID));
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

    private ResignationResponse pending() {
        return new ResignationResponse(REQUEST_ID, EMPLOYEE, "emp.user", "Nhân viên", DEPT,
            "Lý do", "PENDING", REQUESTER, "Người yêu cầu", Instant.now(),
            null, null, null, null);
    }
}
