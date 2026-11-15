package com.mems.service;

import com.mems.dto.GeneralManagerAppointRequest;
import com.mems.dto.GeneralManagerResponse;
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
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class GeneralManagerServiceTest {

    @Mock Actor actor;
    @Mock GeneralManagerRepository managers;
    @Mock DelegationRepository delegations;
    @Mock PeopleAuditService audit;

    private GeneralManagerService service;

    @BeforeEach
    void setUp() {
        service = new GeneralManagerService(actor, managers, delegations, audit);
        when(actor.orgId()).thenReturn("org-1");
        when(actor.userId()).thenReturn("owner-1");
        when(actor.owner()).thenReturn(true);
        when(managers.isActiveMember("org-1", "staff-1")).thenReturn(true);
        when(managers.list("org-1", GeneralManagerService.GENERAL_MANAGER_POSITION_NAME))
            .thenReturn(List.of(new GeneralManagerResponse("staff-1", "staff", "Nguyễn Văn A",
                "dept-1", "Phòng ban", Instant.now())));
    }

    @Test
    @DisplayName("Bổ nhiệm tự tạo chức danh Tổng quản lý nếu chưa có, rồi ghi audit")
    void appointCreatesOrganizationPositionWhenMissing() {
        when(managers.findPositionId("org-1", GeneralManagerService.GENERAL_MANAGER_POSITION_NAME))
            .thenReturn(null);
        when(managers.createPosition(eq("org-1"),
            eq(GeneralManagerService.GENERAL_MANAGER_POSITION_NAME), anyString()))
            .thenReturn("pos-gm");

        var result = service.appoint(new GeneralManagerAppointRequest("staff-1", "Bổ nhiệm"));

        assertThat(result.userId()).isEqualTo("staff-1");
        verify(managers).addAssignment("org-1", "staff-1", "pos-gm", "owner-1", "Bổ nhiệm");
        verify(audit).record(eq("org-1"), eq("owner-1"), eq("GENERAL_MANAGER_POSITION_CREATED"),
            eq("pos-gm"), any());
        verify(audit).record(eq("org-1"), eq("owner-1"), eq("GENERAL_MANAGER_APPOINTED"),
            eq("staff-1"), any());
    }

    @Test
    @DisplayName("Không bổ nhiệm trùng người đã là Tổng quản lý")
    void appointRejectsExistingManager() {
        when(managers.isGeneralManager("org-1", "staff-1",
            GeneralManagerService.GENERAL_MANAGER_POSITION_NAME)).thenReturn(true);

        assertThatThrownBy(() -> service.appoint(new GeneralManagerAppointRequest("staff-1", null)))
            .isInstanceOf(AppException.class)
            .extracting(ex -> ((AppException) ex).getCode())
            .isEqualTo("GENERAL_MANAGER_ALREADY_APPOINTED");
    }

    @Test
    @DisplayName("Bãi nhiệm thu hồi assignment và MỌI ủy quyền còn hiệu lực")
    void removeRevokesAssignmentsAndDelegations() {
        when(managers.isGeneralManager("org-1", "staff-1",
            GeneralManagerService.GENERAL_MANAGER_POSITION_NAME)).thenReturn(true);
        when(managers.findPositionId("org-1", GeneralManagerService.GENERAL_MANAGER_POSITION_NAME))
            .thenReturn("pos-gm");
        when(delegations.revokeAllForDelegate("org-1", "staff-1", "owner-1", "Bãi nhiệm"))
            .thenReturn(List.of("del-1", "del-2"));

        service.remove("staff-1", "Bãi nhiệm");

        verify(managers).revokeAssignment("org-1", "staff-1", "pos-gm", "owner-1", "Bãi nhiệm");
        verify(audit, times(2)).record(eq("org-1"), eq("owner-1"), eq("DELEGATION_REVOKED"),
            anyString(), any());
        verify(audit).record(eq("org-1"), eq("owner-1"), eq("GENERAL_MANAGER_REVOKED"),
            eq("staff-1"), any());
    }

    @Test
    @DisplayName("Bãi nhiệm người không giữ chức Tổng quản lý bị chặn")
    void removeRejectsNonManager() {
        when(managers.isGeneralManager("org-1", "staff-1",
            GeneralManagerService.GENERAL_MANAGER_POSITION_NAME)).thenReturn(false);

        assertThatThrownBy(() -> service.remove("staff-1", null))
            .isInstanceOf(AppException.class)
            .extracting(ex -> ((AppException) ex).getCode())
            .isEqualTo("GENERAL_MANAGER_NOT_APPOINTED");
    }
}
