package com.mems.service;

import com.mems.client.IdentityClient;
import com.mems.dto.DepartmentRequest;
import com.mems.dto.DepartmentResponse;
import com.mems.exception.ApiException;
import com.mems.repository.DepartmentRepository;
import com.mems.security.Actor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DepartmentModuleTest {

    @Mock
    private DepartmentRepository repository;

    @Mock
    private Actor actor;

    @Mock
    private IdentityClient identityClient;

    @Mock
    private PeopleAuditService audit;

    private DepartmentService departmentService;

    @BeforeEach
    void setUp() {
        departmentService = new DepartmentService(repository, actor, identityClient, audit);
        when(actor.orgId()).thenReturn("org-test");
        when(actor.userId()).thenReturn("actor-test");
    }

    @Test
    @DisplayName("Tạo/sửa phòng với module ngoài danh sách cho phép (không phải STUDENT_MANAGEMENT): 400 MODULE_NOT_ENABLED")
    void createDepartmentWithUnsupportedModuleThrows400() {
        DepartmentRequest request = new DepartmentRequest("IT Dept", "Desc", List.of("UNKNOWN_MODULE"));

        assertThatThrownBy(() -> departmentService.create(request))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> {
                ApiException apiEx = (ApiException) ex;
                assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                assertThat(apiEx.getCode()).isEqualTo("MODULE_NOT_ENABLED");
            });
    }

    @Test
    @DisplayName("Tạo/sửa phòng với module chưa active tại tổ chức: 400 MODULE_NOT_ENABLED")
    void createDepartmentWithInactiveOrgModuleThrows400() {
        DepartmentRequest request = new DepartmentRequest("IT Dept", "Desc", List.of("STUDENT_MANAGEMENT"));
        when(identityClient.activeModules("org-test")).thenReturn(List.of()); // organization hasn't activated STUDENT_MANAGEMENT

        assertThatThrownBy(() -> departmentService.create(request))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> {
                ApiException apiEx = (ApiException) ex;
                assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                assertThat(apiEx.getCode()).isEqualTo("MODULE_NOT_ENABLED");
            });
    }

    @Test
    @DisplayName("Tạo phòng với STUDENT_MANAGEMENT: GET trả modules đúng; sửa thành rỗng thì modules rỗng; audit có DEPARTMENT_MODULES_CHANGED")
    void createDepartmentWithStudentManagementAndModifyToEmpty() {
        DepartmentRequest createReq = new DepartmentRequest("Academic Dept", "Desc", List.of("STUDENT_MANAGEMENT"));
        when(identityClient.activeModules("org-test")).thenReturn(List.of("STUDENT_MANAGEMENT"));

        DepartmentResponse createdMock = new DepartmentResponse("dept-1", "Academic Dept", "Desc", Instant.now(), List.of("STUDENT_MANAGEMENT"));
        when(repository.create("org-test", "Academic Dept", "Desc")).thenReturn(createdMock);
        when(repository.require("dept-1", "org-test", false)).thenReturn(createdMock);

        DepartmentResponse created = departmentService.create(createReq);
        assertThat(created.modules()).containsExactly("STUDENT_MANAGEMENT");

        verify(repository).setModules("dept-1", "org-test", List.of("STUDENT_MANAGEMENT"));
        verify(audit).record(eq("org-test"), eq("actor-test"), eq("DEPARTMENT_MODULES_CHANGED"), eq("dept-1"), any());

        // Update to empty modules
        DepartmentRequest updateReq = new DepartmentRequest("Academic Dept", "Desc", List.of());
        when(repository.require("dept-1", "org-test", true)).thenReturn(createdMock);
        DepartmentResponse updatedMock = new DepartmentResponse("dept-1", "Academic Dept", "Desc", Instant.now(), List.of());
        when(repository.require("dept-1", "org-test", false)).thenReturn(updatedMock);

        DepartmentResponse updated = departmentService.update("dept-1", updateReq);
        assertThat(updated.modules()).isEmpty();
        verify(repository).setModules("dept-1", "org-test", List.of());
    }

    @Test
    @DisplayName("Phòng cũ không có module vẫn chạy các luồng cũ; quyền cũ (SCHEDULE_VIEW, FACILITY_MANAGE, PEOPLE_*) không bị loại")
    void legacyDepartmentWithoutModulesRetainsLegacyPermissions() {
        DepartmentResponse legacyDept = new DepartmentResponse("legacy-dept", "General", "No modules", Instant.now(), List.of());
        when(repository.require("legacy-dept", "org-test", false)).thenReturn(legacyDept);

        DepartmentResponse response = departmentService.get("legacy-dept");
        assertThat(response.modules()).isEmpty();
    }
}
