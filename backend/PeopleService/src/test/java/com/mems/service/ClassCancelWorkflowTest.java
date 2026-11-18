package com.mems.service;

import com.mems.dto.ClassCancelRequest;
import com.mems.dto.ClassCloseRejectRequest;
import com.mems.dto.SchoolClassResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.ClassStatusRepository;
import com.mems.repository.SchoolClassRepository;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.Instant;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Quy tắc 14 — hủy lớp còn sinh viên phải qua trưởng phòng duyệt;
 * lớp rỗng được hủy ngay. Người gửi yêu cầu không được tự duyệt.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ClassCancelWorkflowTest {

    private static final String ORG = "org-1";
    private static final String CLASS = "class-1";

    @Mock private ClassStatusRepository repository;
    @Mock private SchoolClassRepository classes;
    @Mock private Actor actor;
    @Mock private OrganizationModuleGuard guard;
    @Mock private ClassApprovalPolicy approvalPolicy;
    @Mock private NotificationService notifications;

    private ClassStatusService service;

    @BeforeEach
    void setUp() {
        service = new ClassStatusService(repository, classes, actor, guard, approvalPolicy, notifications);
        when(actor.orgId()).thenReturn(ORG);
        when(actor.userId()).thenReturn("requester");
        when(classes.require(eq(CLASS), eq(ORG), anyBoolean())).thenReturn(row("NONE", 3));
        when(repository.requestCancel(CLASS, ORG, "Trùng lịch", 0L, "requester")).thenReturn(1);
        when(repository.cancel(CLASS, ORG, 0L)).thenReturn(1);
        when(approvalPolicy.classManagers(ORG, "owner")).thenReturn(Set.of("owner", "head-1"));
    }

    @Test
    @DisplayName("Hủy lớp còn sinh viên → PENDING + sự kiện CANCEL_REQUESTED + báo người quản lý lớp")
    void cancelWithStudentsCreatesApprovalRequest() {
        when(classes.require(CLASS, ORG, false)).thenReturn(row("PENDING", 3));

        SchoolClassResponse result = service.cancel(CLASS, new ClassCancelRequest("Trùng lịch", 0L));

        assertThat(result.cancelState()).isEqualTo("PENDING");
        verify(repository).requestCancel(CLASS, ORG, "Trùng lịch", 0L, "requester");
        verify(repository).insertCloseEvent(CLASS, ORG, "CANCEL_REQUESTED", "requester", "Trùng lịch");
        verify(repository, never()).cancel(anyString(), anyString(), anyLong());
        verify(notifications).notifyAll(eq(ORG), eq(Set.of("owner", "head-1")),
            eq("CLASS_CANCEL_APPROVAL"), anyString(), contains("3"), eq("SCHOOL_CLASS"), eq(CLASS));
    }

    @Test
    @DisplayName("Hủy lớp rỗng → hủy ngay, ghi nhật ký DA_HUY")
    void cancelEmptyClassDirectly() {
        when(classes.require(eq(CLASS), eq(ORG), anyBoolean())).thenReturn(row("NONE", 0));

        service.cancel(CLASS, new ClassCancelRequest("Trùng lịch", 0L));

        verify(repository).cancel(CLASS, ORG, 0L);
        verify(repository).insertStatusLog(CLASS, ORG, "DANG_DIEN_RA", "DA_HUY", "Trùng lịch", "requester");
        verify(repository, never()).requestCancel(anyString(), anyString(), anyString(), anyLong(), anyString());
    }

    @Test
    @DisplayName("Duyệt hủy: cần đúng trưởng phòng, không được tự duyệt")
    void approveCancelRequiresApproverAndBlocksSelfApproval() {
        when(classes.require(eq(CLASS), eq(ORG), anyBoolean())).thenReturn(row("PENDING", 3));
        when(repository.cancelRequester(CLASS, ORG)).thenReturn("head-1");
        when(actor.userId()).thenReturn("approver");
        doThrow(new AppException(ErrorCode.CLASS_APPROVER_NOT_ALLOWED))
            .when(approvalPolicy).requireApprover(ORG, "head-1");

        assertThatThrownBy(() -> service.approveCancel(CLASS))
            .isInstanceOf(AppException.class)
            .extracting(e -> ((AppException) e).getErrorCode())
            .isEqualTo(ErrorCode.CLASS_APPROVER_NOT_ALLOWED);

        reset(approvalPolicy);
        when(repository.cancelRequester(CLASS, ORG)).thenReturn("requester");
        when(actor.userId()).thenReturn("requester");

        assertThatThrownBy(() -> service.approveCancel(CLASS))
            .isInstanceOf(AppException.class)
            .extracting(e -> ((AppException) e).getErrorCode())
            .isEqualTo(ErrorCode.SELF_APPROVAL_NOT_ALLOWED);

        verify(repository, never()).approveCancel(CLASS, ORG);
    }

    @Test
    @DisplayName("Trưởng phòng duyệt → DA_HUY, sự kiện CANCEL_APPROVED, báo người yêu cầu")
    void approveCancelMarksClassCancelled() {
        when(classes.require(eq(CLASS), eq(ORG), anyBoolean())).thenReturn(row("PENDING", 3));
        when(repository.approveCancel(CLASS, ORG)).thenReturn(1);
        when(repository.cancelRequester(CLASS, ORG)).thenReturn("requester");
        when(actor.userId()).thenReturn("head-1");

        service.approveCancel(CLASS);

        verify(repository).approveCancel(CLASS, ORG);
        verify(repository).insertStatusLog(CLASS, ORG, "DANG_DIEN_RA", "DA_HUY", "Trùng lịch", "head-1");
        verify(repository).insertCloseEvent(CLASS, ORG, "CANCEL_APPROVED", "head-1", "Trùng lịch");
        verify(notifications).notify(eq(ORG), eq("requester"), eq("CLASS_CANCEL_APPROVAL"),
            anyString(), anyString(), eq("SCHOOL_CLASS"), eq(CLASS));
    }

    @Test
    @DisplayName("Từ chối hủy cần lý do và trả cancel_state về NONE")
    void rejectCancelRequiresReason() {
        when(classes.require(eq(CLASS), eq(ORG), anyBoolean())).thenReturn(row("PENDING", 3));
        when(repository.rejectCancel(CLASS, ORG)).thenReturn(1);
        when(repository.cancelRequester(CLASS, ORG)).thenReturn("requester");
        when(actor.userId()).thenReturn("head-1");

        assertThatThrownBy(() -> service.rejectCancel(CLASS, new ClassCloseRejectRequest("  ")))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getStatus().value()).isEqualTo(400));

        service.rejectCancel(CLASS, new ClassCloseRejectRequest("Vẫn còn học sinh"));

        verify(repository).rejectCancel(CLASS, ORG);
        verify(repository).insertCloseEvent(CLASS, ORG, "CANCEL_REJECTED", "head-1", "Vẫn còn học sinh");
    }

    private SchoolClassResponse row(String cancelState, int studentCount) {
        return new SchoolClassResponse(CLASS, ORG, "C001", "Lớp 10A", "2026",
            null, null, "DANG_DIEN_RA", null, "NONE", 0L, studentCount, "owner",
            Instant.now(), null, null, null, null, false, null, null, null,
            cancelState, "PENDING".equals(cancelState) ? "Trùng lịch" : null);
    }
}
