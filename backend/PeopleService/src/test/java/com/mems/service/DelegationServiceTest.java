package com.mems.service;

import com.mems.client.IdentityClient;
import com.mems.dto.DelegationCreateRequest;
import com.mems.dto.DelegationResponse;
import com.mems.dto.DelegationUpdateRequest;
import com.mems.dto.PermissionResponse;
import com.mems.exception.AppException;
import com.mems.repository.DelegationRepository;
import com.mems.repository.GeneralManagerRepository;
import com.mems.security.Actor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DelegationServiceTest {

    @Mock Actor actor;
    @Mock DelegationRepository delegations;
    @Mock GeneralManagerRepository managers;
    @Mock EffectivePermissionsService effectivePermissions;
    @Mock IdentityClient identity;
    @Mock PeopleAuditService audit;

    private DelegationService service;

    @BeforeEach
    void setUp() {
        service = new DelegationService(actor, delegations, managers, effectivePermissions, identity, audit);
        when(actor.orgId()).thenReturn("org-1");
        when(actor.userId()).thenReturn("owner-1");
        when(actor.owner()).thenReturn(true);
        when(identity.permissions()).thenReturn(List.of(
            new PermissionResponse("employee.view", "View employees", null),
            new PermissionResponse("student.view", "View students", "STUDENT_MANAGEMENT",
                Set.of("ORGANIZATION"))
        ));
        when(managers.isActiveMember("org-1", "gm-1")).thenReturn(true);
        when(managers.isGeneralManager("org-1", "gm-1", GeneralManagerService.GENERAL_MANAGER_POSITION_NAME))
            .thenReturn(true);
        when(delegations.hasActiveAsDelegate("org-1", "owner-1")).thenReturn(false);
        when(delegations.require(anyString(), eq("org-1"))).thenReturn(activeDelegation());
    }

    private DelegationResponse activeDelegation() {
        return new DelegationResponse("del-1", "owner-1", "Owner", "gm-1", "Tổng quản lý",
            "gm", "dept-1", "Phòng ban", Set.of("employee.view"), "ORGANIZATION",
            Instant.now(), null, "ACTIVE", true, "Lý do", Instant.now(), null, null);
    }

    private DelegationCreateRequest request(String delegateId, Set<String> permissions, Instant to) {
        return new DelegationCreateRequest(delegateId, permissions, null, to, "Lý do", "ORGANIZATION");
    }

    @Test
    @DisplayName("DoD: không cho tự ủy quyền cho chính mình")
    void createRejectsSelfDelegation() {
        assertThatThrownBy(() -> service.create(request("owner-1", Set.of("employee.view"), null)))
            .isInstanceOf(AppException.class)
            .extracting(ex -> ((AppException) ex).getCode())
            .isEqualTo("DELEGATION_SELF_NOT_ALLOWED");
        verify(delegations, never()).insert(anyString(), anyString(), anyString(), anyString(),
            anyString(), any(), any(), any(), anyString(), any());
    }

    @Test
    @DisplayName("DoD: người nhận phải là Tổng quản lý đang được bổ nhiệm")
    void createRequiresGeneralManagerDelegate() {
        when(managers.isGeneralManager("org-1", "staff-2", GeneralManagerService.GENERAL_MANAGER_POSITION_NAME))
            .thenReturn(false);
        when(managers.isActiveMember("org-1", "staff-2")).thenReturn(true);

        assertThatThrownBy(() -> service.create(request("staff-2", Set.of("employee.view"), null)))
            .isInstanceOf(AppException.class)
            .extracting(ex -> ((AppException) ex).getCode())
            .isEqualTo("DELEGATE_NOT_GENERAL_MANAGER");
    }

    @Test
    @DisplayName("Quyền ngoài danh mục bị từ chối")
    void createRejectsUnknownPermission() {
        assertThatThrownBy(() -> service.create(request("gm-1", Set.of("do.not.exist"), null)))
            .isInstanceOf(AppException.class)
            .extracting(ex -> ((AppException) ex).getCode())
            .isEqualTo("UNKNOWN_PERMISSION");
    }

    @Test
    @DisplayName("Hạn kết thúc phải sau thời điểm bắt đầu")
    void createRejectsInvalidWindow() {
        Instant from = Instant.now();
        var invalid = new DelegationCreateRequest("gm-1", Set.of("employee.view"), from,
            from.minus(1, ChronoUnit.HOURS), null, "ORGANIZATION");

        assertThatThrownBy(() -> service.create(invalid))
            .isInstanceOf(AppException.class)
            .extracting(ex -> ((AppException) ex).getCode())
            .isEqualTo("DELEGATION_INVALID_WINDOW");
    }

    @Test
    @DisplayName("Tạo ủy quyền hợp lệ: lưu DB và ghi audit DELEGATION_CREATED")
    void createStoresDelegationAndAudits() {
        Instant to = Instant.now().plus(30, ChronoUnit.DAYS);

        service.create(request("gm-1", Set.of("employee.view", "student.view"), to));

        verify(delegations).insert(anyString(), eq("org-1"), eq("owner-1"), eq("gm-1"),
            eq("ORGANIZATION"), any(Instant.class), eq(to), eq("Lý do"), eq("owner-1"),
            eq(Set.of("employee.view", "student.view")));
        verify(audit).record(eq("org-1"), eq("owner-1"), eq("DELEGATION_CREATED"),
            anyString(), any());
    }

    @Test
    @DisplayName("Điều chỉnh ủy quyền đã thu hồi bị chặn")
    void updateRejectsInactiveDelegation() {
        DelegationResponse revoked = new DelegationResponse("del-1", "owner-1", "Owner", "gm-1",
            "Tổng quản lý", "gm", "dept-1", "Phòng ban", Set.of("employee.view"), "ORGANIZATION",
            Instant.now(), null, "REVOKED", false, null, Instant.now(), Instant.now(), "Thu hồi");
        when(delegations.require("del-1", "org-1")).thenReturn(revoked);

        assertThatThrownBy(() -> service.update("del-1",
                new DelegationUpdateRequest(Set.of("employee.view"), null, null, null)))
            .isInstanceOf(AppException.class)
            .extracting(ex -> ((AppException) ex).getCode())
            .isEqualTo("DELEGATION_NOT_ACTIVE");
    }

    @Test
    @DisplayName("Thu hồi ủy quyền đang hiệu lực: đổi trạng thái + audit")
    void revokeMarksInactiveAndAudits() {
        service.revoke("del-1", null);

        verify(delegations).revoke("del-1", "org-1", "owner-1", null);
        verify(audit).record(eq("org-1"), eq("owner-1"), eq("DELEGATION_REVOKED"),
            eq("del-1"), any());
    }

    @Test
    @DisplayName("DEL-04: job hết hạn chuyển ủy quyền quá hạn sang EXPIRED")
    void expireDelegationsMarksOverdue() {
        service.expireDelegations();

        verify(delegations).markExpired();
    }

    @Test
    @DisplayName("Chỉ Owner được quản lý ủy quyền")
    void nonOwnerCannotCreate() {
        when(actor.owner()).thenReturn(false);
        when(actor.forbidden(anyString())).thenReturn(new AppException(
            com.mems.exception.ErrorCode.FORBIDDEN, "Only the organization owner can manage delegations"));

        assertThatThrownBy(() -> service.create(request("gm-1", Set.of("employee.view"), null)))
            .isInstanceOf(AppException.class);
        assertThat(service).isNotNull();
    }
}
