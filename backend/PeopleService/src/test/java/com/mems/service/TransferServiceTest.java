package com.mems.service;

import com.mems.dto.*;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.DepartmentRepository;
import com.mems.repository.MemberRepository;
import com.mems.repository.TransferRepository;
import com.mems.security.Actor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TransferServiceTest {

    private static final String ORG = "org-1";
    private static final String REQUEST = "req-1";

    @Mock private Actor actor;
    @Mock private MembershipPolicy policy;
    @Mock private EffectivePermissionsService effectivePermissions;
    @Mock private DepartmentRepository departments;
    @Mock private MemberRepository members;
    @Mock private TransferRepository transfers;
    @Mock private ClassReassignmentNotifier reassignments;
    @Mock private NotificationService notifications;
    @Mock private PeopleAuditService audit;

    private TransferService service;
    private final AtomicReference<String> currentUser = new AtomicReference<>("requester");
    private final AtomicReference<TransferResponse> state = new AtomicReference<>();

    @BeforeEach
    void setUp() {
        service = new TransferService(actor, policy, effectivePermissions, departments, members,
            transfers, reassignments, notifications, audit);
        when(actor.orgId()).thenReturn(ORG);
        when(actor.userId()).thenAnswer(invocation -> currentUser.get());
        when(actor.owner()).thenReturn(false);
        when(policy.hasPermission(anyString(), anyString())).thenReturn(true);
        when(departments.require("dept-new", ORG, false)).thenReturn(
            new DepartmentResponse("dept-new", "Phòng mới", null, Instant.now(), List.of()));
        when(transfers.headHolders(ORG, "dept-old", TransferService.HEAD_POSITION_NAMES))
            .thenReturn(Set.of("source-head"));
        when(transfers.headHolders(ORG, "dept-new", TransferService.HEAD_POSITION_NAMES))
            .thenReturn(Set.of("target-head"));
        when(transfers.assignmentHolders(ORG, List.of("dept-old", "dept-new")))
            .thenReturn(Set.of("hr-user"));
        when(transfers.currentDepartment(ORG, "hr-user")).thenReturn(Optional.of("dept-old"));
        when(effectivePermissions.resolve(ORG, "hr-user", "dept-old")).thenReturn(
            new EffectivePermissionsService.EffectivePermissions(
                Set.of("employee.approve_transfer"), Map.of()));
        when(transfers.currentDepartment(ORG, "emp-1")).thenReturn(Optional.of("dept-old"));
        when(members.require("emp-1", ORG, "dept-old", true)).thenReturn(
            new MemberResponse("emp-1", "emp-user", "dept-old", "STAFF", "ACTIVE",
                "owner-1", Instant.now(), Set.of(), Set.of()));
        when(reassignments.flagAndNotify(ORG, "emp-1", "Giáo viên được chuyển phòng ban"))
            .thenReturn(1);
    }

    @Test
    @DisplayName("Tạo yêu cầu: bốn bên nhận thông báo, 4 bước đều PENDING")
    void createNotifiesAllFourParties() {
        when(transfers.hasPending(ORG, "emp-1")).thenReturn(false);
        when(transfers.require(REQUEST, ORG)).thenReturn(request(Map.of()));
        when(transfers.require(anyString(), eq(ORG))).thenReturn(request(Map.of()));

        TransferCreateRequest payload = new TransferCreateRequest("emp-1", "dept-new", "Lý do");
        service.create(payload);

        verify(transfers).create(anyString(), eq(ORG), eq("emp-1"), eq("dept-old"), eq("dept-new"),
            eq("Lý do"), eq("requester"));
        verify(notifications).notifyAll(eq(ORG),
            eq(Set.of("source-head", "target-head", "emp-1", "hr-user")),
            eq("TRANSFER_REQUESTED"), anyString(), anyString(), eq("TRANSFER_REQUEST"), anyString());
        verify(audit).record(eq(ORG), eq("requester"), eq("TRANSFER_REQUESTED"), eq("emp-1"), any());
    }

    @Test
    @DisplayName("Không tạo được khi một phòng thiếu Trưởng phòng")
    void createFailsWhenHeadMissing() {
        when(transfers.hasPending(ORG, "emp-1")).thenReturn(false);
        when(transfers.headHolders(ORG, "dept-new", TransferService.HEAD_POSITION_NAMES))
            .thenReturn(Set.of());

        assertThatThrownBy(() -> service.create(
            new TransferCreateRequest("emp-1", "dept-new", "Lý do")))
            .isInstanceOf(AppException.class)
            .extracting(e -> ((AppException) e).getErrorCode())
            .isEqualTo(ErrorCode.TRANSFER_HEAD_MISSING);
        verify(transfers, never()).create(anyString(), anyString(), anyString(), anyString(),
            anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("Không tạo yêu cầu thứ hai khi đang có yêu cầu PENDING")
    void createRejectsDuplicatePending() {
        when(transfers.hasPending(ORG, "emp-1")).thenReturn(true);

        assertThatThrownBy(() -> service.create(
            new TransferCreateRequest("emp-1", "dept-new", "Lý do")))
            .isInstanceOf(AppException.class)
            .extracting(e -> ((AppException) e).getErrorCode())
            .isEqualTo(ErrorCode.TRANSFER_ALREADY_PENDING);
        verify(transfers, never()).create(anyString(), anyString(), anyString(), anyString(),
            anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("Người không giữ bước không được duyệt thay")
    void strangerCannotDecideStep() {
        currentUser.set("stranger");
        installState(request(Map.of()));

        assertThatThrownBy(() -> service.decide(REQUEST, "TARGET_HEAD", true, null))
            .isInstanceOf(AppException.class)
            .extracting(e -> ((AppException) e).getErrorCode())
            .isEqualTo(ErrorCode.TRANSFER_STEP_NOT_ALLOWED);
        verify(transfers, never()).decideStep(anyString(), anyString(), anyString(),
            anyString(), any());
    }

    @Test
    @DisplayName("Trưởng phòng không được duyệt bước xác nhận của nhân sự")
    void headCannotDecideEmployeeStep() {
        currentUser.set("source-head");
        installState(request(Map.of()));

        assertThatThrownBy(() -> service.decide(REQUEST, "EMPLOYEE", true, null))
            .isInstanceOf(AppException.class)
            .extracting(e -> ((AppException) e).getErrorCode())
            .isEqualTo(ErrorCode.TRANSFER_STEP_NOT_ALLOWED);
        verify(transfers, never()).decideStep(anyString(), anyString(), anyString(),
            anyString(), any());
    }

    @ParameterizedTest(name = "Từ chối ở bước {0} → REJECTED, không áp dụng")
    @ValueSource(strings = {"SOURCE_HEAD", "TARGET_HEAD", "HR", "EMPLOYEE"})
    void anyRejectionStopsFlow(String step) {
        configureActorFor(step);
        installState(request(Map.of()));

        service.decide(REQUEST, step, false, "Không đồng ý");

        verify(transfers).rejectRequest(REQUEST);
        verify(transfers, never()).markApplied(anyString(), anyString());
        verify(members, never()).transferToDepartment(anyString(), anyString(), anyString(),
            anyString(), anyString(), anyString());
        verify(notifications).notifyAll(eq(ORG), eq(Set.of("requester", "emp-1")),
            eq("TRANSFER_REJECTED"), anyString(), anyString(), eq("TRANSFER_REQUEST"), eq(REQUEST));
    }

    @Test
    @DisplayName("Đủ 4 duyệt → áp dụng chuyển phòng và gắn cờ phân công lại lớp")
    void fourApprovalsApplyTransfer() {
        installState(request(Map.of()));
        when(members.transferToDepartment(eq("emp-1"), eq(ORG), eq("dept-old"), eq("dept-new"),
            anyString(), anyString())).thenReturn(2);

        for (String step : TransferRepository.STEPS) {
            configureActorFor(step);
            service.decide(REQUEST, step, true, null);
        }

        verify(members).transferToDepartment(eq("emp-1"), eq(ORG), eq("dept-old"), eq("dept-new"),
            anyString(), contains("Lý do"));
        verify(transfers).markApplied(eq(REQUEST), anyString());
        verify(reassignments).flagAndNotify(ORG, "emp-1", "Giáo viên được chuyển phòng ban");
        verify(notifications).notify(eq(ORG), eq("emp-1"), eq("CLASS_REASSIGNMENT_NEEDED"),
            anyString(), anyString(), eq("TRANSFER_REQUEST"), eq(REQUEST));
        verify(notifications).notifyAll(eq(ORG), eq(Set.of("requester", "emp-1")),
            eq("TRANSFER_APPROVED"), anyString(), anyString(), eq("TRANSFER_REQUEST"), eq(REQUEST));
        verify(audit).record(eq(ORG), anyString(), eq("TRANSFER_APPLIED"), eq("emp-1"), any());
    }

    private void configureActorFor(String step) {
        switch (step) {
            case "SOURCE_HEAD" -> currentUser.set("source-head");
            case "TARGET_HEAD" -> currentUser.set("target-head");
            case "HR" -> currentUser.set("hr-user");
            case "EMPLOYEE" -> currentUser.set("emp-1");
            default -> currentUser.set("requester");
        }
    }

    private void installState(TransferResponse initial) {
        state.set(initial);
        when(transfers.requireForUpdate(REQUEST, ORG)).thenAnswer(invocation -> state.get());
        when(transfers.require(REQUEST, ORG)).thenAnswer(invocation -> state.get());
        when(transfers.decideStep(eq(REQUEST), anyString(), anyString(), anyString(), any()))
            .thenAnswer(invocation -> {
                String step = invocation.getArgument(1);
                String decision = invocation.getArgument(2);
                state.updateAndGet(current -> withDecision(current, step, decision));
                return true;
            });
    }

    private TransferResponse request(Map<String, String> decisions) {
        List<TransferStepResponse> steps = new ArrayList<>();
        for (String step : TransferRepository.STEPS) {
            steps.add(new TransferStepResponse(step, decisions.getOrDefault(step, "PENDING"),
                null, null, null, null));
        }
        return new TransferResponse(REQUEST, "emp-1", "emp-user", "Nguyễn Văn A",
            "dept-old", "Phòng cũ", "dept-new", "Phòng mới", "Lý do", "PENDING",
            "requester", "Người tạo", Instant.now(), null, null, steps, List.of());
    }

    private TransferResponse withDecision(TransferResponse current, String step, String decision) {
        List<TransferStepResponse> steps = current.steps().stream()
            .map(s -> s.step().equals(step)
                ? new TransferStepResponse(s.step(), decision, currentUser.get(), "Người duyệt",
                    Instant.now(), null)
                : s)
            .toList();
        return new TransferResponse(current.id(), current.userId(), current.username(),
            current.fullName(), current.fromDepartmentId(), current.fromDepartmentName(),
            current.toDepartmentId(), current.toDepartmentName(), current.reason(),
            current.status(), current.requestedBy(), current.requestedByName(),
            current.requestedAt(), current.appliedAt(), current.appliedBy(), steps, List.of());
    }
}
