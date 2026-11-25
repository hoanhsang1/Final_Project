package com.mems.service;

import com.mems.client.IdentityClient;
import com.mems.dto.DepartmentModuleImpactResponse;
import com.mems.dto.DepartmentRequest;
import com.mems.dto.DepartmentResponse;
import com.mems.dto.PermissionBundleResponse;
import com.mems.dto.PermissionResponse;
import com.mems.dto.PositionResponse;
import com.mems.exception.AppException;
import com.mems.repository.DepartmentRepository;
import com.mems.repository.PositionRepository;
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
import java.util.Set;

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
    private PositionRepository positions;

    @Mock
    private Actor actor;

    @Mock
    private IdentityClient identityClient;

    @Mock
    private PeopleAuditService audit;

    @Mock
    private DefaultPositionSeeder positionSeeder;

    private DepartmentService departmentService;

    @BeforeEach
    void setUp() {
        departmentService = new DepartmentService(
            repository, positions, actor, identityClient, audit, positionSeeder);
        when(actor.orgId()).thenReturn("org-test");
        when(actor.userId()).thenReturn("actor-test");
        when(identityClient.permissions()).thenReturn(List.of(
            new PermissionResponse("employee.view", "View employees", null),
            new PermissionResponse("student.view", "View students", "STUDENT_MANAGEMENT",
                Set.of("ORGANIZATION")),
            new PermissionResponse("schedule.view", "View schedules", "SCHEDULE_MANAGEMENT"),
            new PermissionResponse("facility.view", "View facilities", "FACILITY_MANAGEMENT"),
            new PermissionResponse("facility.manage", "Manage facilities", "FACILITY_MANAGEMENT")
        ));
        when(identityClient.permissionBundles()).thenReturn(List.of(
            new PermissionBundleResponse("FACILITY_MANAGEMENT", "Cơ sở vật chất", "Facility",
                Set.of("facility.view", "facility.manage"), Set.of("ORGANIZATION", "DEPARTMENT"))
        ));
        when(identityClient.activeModules("org-test"))
            .thenReturn(List.of("STUDENT_MANAGEMENT", "SCHEDULE_MANAGEMENT", "FACILITY_MANAGEMENT"));
    }

    @Test
    @DisplayName("Tạo/sửa phòng với module ngoài danh mục quyền: 400 MODULE_NOT_ENABLED")
    void createDepartmentWithUnsupportedModuleThrows400() {
        DepartmentRequest request = new DepartmentRequest("IT Dept", "Desc", List.of("UNKNOWN_MODULE"));

        assertThatThrownBy(() -> departmentService.create(request))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> {
                AppException apiEx = (AppException) ex;
                assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                assertThat(apiEx.getCode()).isEqualTo("MODULE_NOT_ENABLED");
            });
    }

    @Test
    @DisplayName("Tạo/sửa phòng với module chưa active tại tổ chức: 400 MODULE_NOT_ENABLED")
    void createDepartmentWithInactiveOrgModuleThrows400() {
        DepartmentRequest request = new DepartmentRequest("IT Dept", "Desc", List.of("STUDENT_MANAGEMENT"));
        when(identityClient.activeModules("org-test")).thenReturn(List.of());

        assertThatThrownBy(() -> departmentService.create(request))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> {
                AppException apiEx = (AppException) ex;
                assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                assertThat(apiEx.getCode()).isEqualTo("MODULE_NOT_ENABLED");
            });
    }

    @Test
    @DisplayName("Tạo phòng với STUDENT_MANAGEMENT: GET trả modules đúng; sửa thành rỗng thì modules rỗng")
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

        DepartmentRequest updateReq = new DepartmentRequest("Academic Dept", "Desc", List.of());
        when(repository.require("dept-1", "org-test", true)).thenReturn(createdMock);
        DepartmentResponse updatedMock = new DepartmentResponse("dept-1", "Academic Dept", "Desc", Instant.now(), List.of());
        when(repository.require("dept-1", "org-test", false)).thenReturn(updatedMock);

        DepartmentResponse updated = departmentService.update("dept-1", updateReq);
        assertThat(updated.modules()).isEmpty();
        verify(repository).setModules("dept-1", "org-test", List.of());
    }

    @Test
    @DisplayName("Phòng cũ không có module vẫn đọc được; không tự thêm/xoá quyền")
    void legacyDepartmentWithoutModulesRetainsLegacyPermissions() {
        DepartmentResponse legacyDept = new DepartmentResponse("legacy-dept", "General", "No modules", Instant.now(), List.of());
        when(repository.require("legacy-dept", "org-test", false)).thenReturn(legacyDept);

        DepartmentResponse response = departmentService.get("legacy-dept");
        assertThat(response.modules()).isEmpty();
    }

    @Test
    @DisplayName("Quyền khả dụng của phòng: HR luôn có; facility.* chỉ khi phòng bật module Facility")
    void availablePermissionsFollowDepartmentModules() {
        when(repository.require("dept-it", "org-test", false))
            .thenReturn(new DepartmentResponse("dept-it", "IT", null, Instant.now(),
                List.of("STUDENT_MANAGEMENT")));

        List<String> codes = departmentService.availablePermissions("dept-it").stream()
            .map(PermissionResponse::code).toList();

        assertThat(codes).contains("employee.view", "student.view");
        assertThat(codes).doesNotContain("facility.view", "schedule.view");
    }

    @Test
    @DisplayName("Quyền khả dụng loại quyền của module phòng bật nhưng tổ chức đã tắt")
    void availablePermissionsRequireOrganizationModuleEnabled() {
        when(repository.require("dept-facility", "org-test", false))
            .thenReturn(new DepartmentResponse("dept-facility", "CSVC", null, Instant.now(),
                List.of("FACILITY_MANAGEMENT")));
        when(identityClient.activeModules("org-test")).thenReturn(List.of("STUDENT_MANAGEMENT"));

        List<String> codes = departmentService.availablePermissions("dept-facility").stream()
            .map(PermissionResponse::code).toList();

        assertThat(codes).contains("employee.view");
        assertThat(codes).doesNotContain("facility.view");
    }

    @Test
    @DisplayName("Gỡ module Facility: liệt kê chức danh/quyền bị mất hiệu lực, không xoá dữ liệu")
    void moduleImpactListsPositionsHoldingRemovedModulePermissions() {
        when(repository.require("dept-facility", "org-test", false))
            .thenReturn(new DepartmentResponse("dept-facility", "CSVC", null, Instant.now(),
                List.of("FACILITY_MANAGEMENT", "STUDENT_MANAGEMENT")));
        when(positions.listByDepartment("org-test", "dept-facility")).thenReturn(List.of(
            new PositionResponse("pos-facility", "Nhân viên CSVC", null, Instant.now(),
                Set.of("facility.view"), "GENERAL", Set.of("FACILITY_MANAGEMENT"),
                "DEPARTMENT", "dept-facility"),
            new PositionResponse("pos-student", "Giáo vụ", null, Instant.now(),
                Set.of("student.view"), "GENERAL", Set.of(), "DEPARTMENT", "dept-facility")
        ));
        when(positions.distinctHolders("org-test", List.of("pos-facility"))).thenReturn(2);

        DepartmentModuleImpactResponse impact = departmentService.moduleImpact(
            "dept-facility", List.of("STUDENT_MANAGEMENT"));

        assertThat(impact.removedModules()).containsExactly("FACILITY_MANAGEMENT");
        assertThat(impact.positions()).hasSize(1);
        assertThat(impact.positions().get(0).name()).isEqualTo("Nhân viên CSVC");
        assertThat(impact.positions().get(0).permissions())
            .containsExactlyInAnyOrder("facility.view", "facility.manage");
        assertThat(impact.positions().get(0).members()).isEqualTo(2);
        assertThat(impact.affectedMembers()).isEqualTo(2);
        verify(repository, never()).setModules(anyString(), anyString(), anyList());
    }
}
