package com.mems.service;

import com.mems.client.IdentityClient;
import com.mems.dto.DepartmentResponse;
import com.mems.dto.PermissionBundleResponse;
import com.mems.dto.PermissionResponse;
import com.mems.dto.PositionCloneRequest;
import com.mems.dto.PositionCloneResponse;
import com.mems.dto.PositionRequest;
import com.mems.dto.PositionResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
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

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PositionServiceTest {

    private static final String ORG = "org-1";

    @Mock private PositionRepository repository;
    @Mock private DepartmentRepository departments;
    @Mock private Actor actor;
    @Mock private IdentityClient identity;
    @Mock private PeopleAuditService audit;
    @Mock private DefaultPositionSeeder seeder;
    @Mock private EffectivePermissionsService effectivePermissions;

    private PositionService service;

    @BeforeEach
    void setUp() {
        service = new PositionService(repository, departments, actor, identity, audit, seeder, effectivePermissions);
        when(actor.orgId()).thenReturn(ORG);
        when(actor.userId()).thenReturn("owner-1");
        when(actor.owner()).thenReturn(true);

        when(identity.permissions()).thenReturn(List.of(
            new PermissionResponse("employee.view", "View employees", null),
            new PermissionResponse("employee.edit", "Edit employees", null),
            new PermissionResponse("employee.assign_position", "Assign positions", null),
            new PermissionResponse("position.view", "View positions", null),
            new PermissionResponse("position.manage", "Manage positions", null),
            new PermissionResponse("department.view", "View departments", null),
            new PermissionResponse("department.manage", "Manage departments", null,
                Set.of("ORGANIZATION")),
            new PermissionResponse("student.view", "View students", "STUDENT_MANAGEMENT",
                Set.of("ORGANIZATION")),
            new PermissionResponse("facility.view", "View facilities", "FACILITY_MANAGEMENT"),
            new PermissionResponse("facility.manage", "Manage facilities", "FACILITY_MANAGEMENT")
        ));
        Set<String> hrPermissions = Set.of("employee.view", "employee.edit", "employee.assign_position",
            "position.view", "position.manage", "department.view", "department.manage");
        when(identity.permissionBundles()).thenReturn(List.of(
            new PermissionBundleResponse("HR_MANAGEMENT", "Quản lý nhân sự", "HR", hrPermissions,
                Set.of("ORGANIZATION", "DEPARTMENT")),
            new PermissionBundleResponse("FACILITY_MANAGEMENT", "Cơ sở vật chất", "Facility",
                Set.of("facility.view", "facility.manage"), Set.of("ORGANIZATION", "DEPARTMENT"))
        ));
        when(effectivePermissions.bundlePermissions()).thenReturn(Map.of(
            "HR_MANAGEMENT", hrPermissions,
            "FACILITY_MANAGEMENT", Set.of("facility.view", "facility.manage")));

        when(identity.activeModules(ORG)).thenReturn(List.of("STUDENT_MANAGEMENT", "FACILITY_MANAGEMENT"));
        when(departments.require("dept-1", ORG, false)).thenReturn(new DepartmentResponse(
            "dept-1", "Phòng đào tạo", null, Instant.now(), List.of("STUDENT_MANAGEMENT")));
        when(repository.save(anyString(), eq(ORG), any(PositionRequest.class), anyBoolean()))
            .thenAnswer(invocation -> {
                String id = invocation.getArgument(0);
                PositionRequest request = invocation.getArgument(2);
                return new PositionResponse(id, request.name(), request.description(), Instant.now(),
                    request.permissions(), "GENERAL", request.bundleCodes(), request.scope(),
                    request.departmentId());
            });
        when(repository.save(anyString(), eq(ORG), any(PositionRequest.class), anyBoolean(), any()))
            .thenAnswer(invocation -> {
                String id = invocation.getArgument(0);
                PositionRequest request = invocation.getArgument(2);
                String profileType = invocation.getArgument(4);
                return new PositionResponse(id, request.name(), request.description(), Instant.now(),
                    request.permissions(), profileType, request.bundleCodes(), request.scope(),
                    request.departmentId());
            });
    }

    @Test
    @DisplayName("Phòng chưa bật module Facility → không gán được facility.* cho chức danh")
    void createRejectsPermissionOutsideDepartmentModules() {
        PositionRequest request = new PositionRequest("Nhân viên CSVC", null,
            Set.of("facility.view"), Set.of(), "DEPARTMENT", "dept-1");

        assertThatThrownBy(() -> service.create(request))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> {
                AppException apiEx = (AppException) ex;
                assertThat(apiEx.getStatus().value()).isEqualTo(403);
                assertThat(apiEx.getCode()).isEqualTo("PERMISSION_OUT_OF_MODULE");
            });
    }

    @Test
    @DisplayName("Phòng bật module Facility → gán được facility.* cho chức danh")
    void createAllowsPermissionInsideDepartmentModules() {
        when(departments.require("dept-facility", ORG, false)).thenReturn(new DepartmentResponse(
            "dept-facility", "Phòng CSVC", null, Instant.now(), List.of("FACILITY_MANAGEMENT")));

        PositionResponse created = service.create(new PositionRequest("Nhân viên CSVC", null,
            Set.of("facility.view", "facility.manage"), Set.of(), "DEPARTMENT", "dept-facility"));

        assertThat(created.permissions()).containsExactlyInAnyOrder("facility.view", "facility.manage");
    }

    @Test
    @DisplayName("Gán bundle HR_MANAGEMENT cho chức danh phòng ban (trưởng phòng) vẫn hợp lệ")
    void createAllowsHrBundleForDepartmentPosition() {
        PositionResponse created = service.create(new PositionRequest("Trưởng phòng", null,
            Set.of(), Set.of("HR_MANAGEMENT"), "DEPARTMENT", "dept-1"));

        assertThat(created.bundleCodes()).containsExactly("HR_MANAGEMENT");
        assertThat(created.scope()).isEqualTo("DEPARTMENT");
    }

    @Test
    @DisplayName("Người không phải Owner không tạo được chức danh phạm vi ORGANIZATION")
    void nonOwnerCannotCreateOrganizationPosition() {
        when(actor.owner()).thenReturn(false);
        when(actor.forbidden(anyString()))
            .thenReturn(new AppException(ErrorCode.FORBIDDEN, "Only the owner"));

        PositionRequest request = new PositionRequest("Tổng quản lý", null,
            Set.of("employee.view"), Set.of(), "ORGANIZATION", null);

        assertThatThrownBy(() -> service.create(request))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("FORBIDDEN"));
    }

    @Test
    @DisplayName("Nhân bản sang phòng khác: loại quyền ngoài module, trả danh sách quyền bị loại")
    void cloneStripsPermissionsOutsideTargetDepartmentModules() {
        when(repository.require("pos-src", ORG, false)).thenReturn(new PositionResponse(
            "pos-src", "Chức danh gốc", "desc", Instant.now(),
            Set.of("employee.view", "facility.view", "department.manage", "student.view"),
            "GENERAL", Set.of("HR_MANAGEMENT", "FACILITY_MANAGEMENT"), "ORGANIZATION", null));

        PositionCloneResponse result = service.clone("pos-src", new PositionCloneRequest(
            "Chức danh sao chép", "dept-1"));

        assertThat(result.position().permissions())
            .containsExactlyInAnyOrder("employee.view", "student.view", "department.manage");
        assertThat(result.removedPermissions())
            .containsExactlyInAnyOrder("facility.view", "facility.manage");
        assertThat(result.droppedBundles()).containsExactly("FACILITY_MANAGEMENT");
        assertThat(result.position().bundleCodes()).containsExactly("HR_MANAGEMENT");
        assertThat(result.position().departmentId()).isEqualTo("dept-1");
        assertThat(result.position().scope()).isEqualTo("DEPARTMENT");
    }

    @Test
    @DisplayName("Nhân bản không có quyền bị loại thì danh sách rỗng")
    void cloneWithoutLostPermissionsReturnsEmptyList() {
        when(repository.require("pos-src", ORG, false)).thenReturn(new PositionResponse(
            "pos-src", "Chức danh gốc", null, Instant.now(),
            Set.of("employee.view", "student.view"), "GENERAL", Set.of("HR_MANAGEMENT"),
            "DEPARTMENT", "dept-1"));

        PositionCloneResponse result = service.clone("pos-src", new PositionCloneRequest(null, "dept-1"));

        assertThat(result.removedPermissions()).isEmpty();
        assertThat(result.position().name()).isEqualTo("Chức danh gốc (bản sao)");
    }

    @Test
    @DisplayName("Impact trả số người đang giữ chức danh")
    void impactReturnsActiveHolders() {
        when(repository.require("pos-1", ORG, false)).thenReturn(new PositionResponse(
            "pos-1", "Chức danh", null, Instant.now(), Set.of(), "GENERAL",
            Set.of(), "DEPARTMENT", "dept-1"));
        when(repository.distinctHolders(ORG, List.of("pos-1"))).thenReturn(3);

        assertThat(service.impact("pos-1").activeHolders()).isEqualTo(3);
    }

    // ----- RBAC-01: kiểm tra quyền trên dữ liệu đã lưu, không dựa vào request -----

    private void nonOwner() {
        when(actor.owner()).thenReturn(false);
        when(actor.forbidden(anyString()))
            .thenReturn(new AppException(ErrorCode.FORBIDDEN, "forbidden"));
    }

    private static PositionResponse stored(String id, String scope, String departmentId,
            Set<String> permissions) {
        return new PositionResponse(id, "Chức danh lưu", "desc", Instant.now(), permissions,
            "GENERAL", Set.of(), scope, departmentId);
    }

    @Test
    @DisplayName("Non-owner không sửa được chức danh mẫu dùng chung (departmentId null)")
    void nonOwnerCannotUpdateSharedTemplate() {
        nonOwner();
        when(repository.require("pos-shared", ORG, true))
            .thenReturn(stored("pos-shared", "DEPARTMENT", null, Set.of("employee.view")));

        assertThatThrownBy(() -> service.update("pos-shared", new PositionRequest(
            "Giáo viên (sửa)", null, Set.of("employee.view"), Set.of(), "DEPARTMENT", "dept-1")))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("FORBIDDEN"));
    }

    @Test
    @DisplayName("Non-owner không 'hạ' chức danh ORGANIZATION thành DEPARTMENT để chiếm quyền")
    void nonOwnerCannotTakeOverOrganizationPosition() {
        nonOwner();
        when(repository.require("pos-org", ORG, true))
            .thenReturn(stored("pos-org", "ORGANIZATION", null, Set.of("employee.view")));

        assertThatThrownBy(() -> service.update("pos-org", new PositionRequest(
            "Tổng quản lý", null, Set.of("employee.view"), Set.of(), "DEPARTMENT", "dept-1")))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("FORBIDDEN"));
    }

    @Test
    @DisplayName("Non-owner không sửa được chức danh của phòng khác bằng cách gửi departmentId của mình")
    void nonOwnerCannotUpdatePositionOfAnotherDepartment() {
        nonOwner();
        when(repository.require("pos-other", ORG, true))
            .thenReturn(stored("pos-other", "DEPARTMENT", "dept-other", Set.of("employee.view")));

        assertThatThrownBy(() -> service.update("pos-other", new PositionRequest(
            "Chức danh lưu", null, Set.of("employee.view"), Set.of(), "DEPARTMENT", "dept-1")))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("FORBIDDEN"));
    }

    @Test
    @DisplayName("Non-owner thiếu position.manage không sửa được chức danh không có permission")
    void nonOwnerCannotUpdatePermissionlessPositionWithoutManageRight() {
        nonOwner();
        when(repository.require("pos-empty", ORG, true))
            .thenReturn(stored("pos-empty", "DEPARTMENT", "dept-1", Set.of()));

        assertThatThrownBy(() -> service.update("pos-empty", new PositionRequest(
            "Chức danh không quyền", null, Set.of(), Set.of(), "DEPARTMENT", "dept-1")))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("FORBIDDEN"));
    }

    @Test
    @DisplayName("Non-owner có position.manage trong phòng sửa được chức danh không có permission")
    void nonOwnerWithManageRightCanUpdatePermissionlessPosition() {
        nonOwner();
        when(actor.hasPermissionIn("position.manage", "dept-1")).thenReturn(true);
        when(repository.require("pos-empty", ORG, true))
            .thenReturn(stored("pos-empty", "DEPARTMENT", "dept-1", Set.of()));

        PositionResponse updated = service.update("pos-empty", new PositionRequest(
            "Chức danh không quyền", null, Set.of(), Set.of(), "DEPARTMENT", "dept-1"));

        assertThat(updated.name()).isEqualTo("Chức danh không quyền");
        assertThat(updated.departmentId()).isEqualTo("dept-1");
    }

    @Test
    @DisplayName("Non-owner chỉ thêm được permission mà mình có trong phòng")
    void nonOwnerCanAddPermissionWithinOwnScope() {
        nonOwner();
        when(actor.hasPermissionIn(anyString(), eq("dept-1"))).thenReturn(true);
        when(repository.require("pos-1", ORG, true))
            .thenReturn(stored("pos-1", "DEPARTMENT", "dept-1", Set.of("employee.view")));

        PositionResponse updated = service.update("pos-1", new PositionRequest(
            "Chức danh", null, Set.of("employee.view", "employee.edit"), Set.of(),
            "DEPARTMENT", "dept-1"));

        assertThat(updated.permissions()).containsExactlyInAnyOrder("employee.view", "employee.edit");
    }

    @Test
    @DisplayName("Không cho đổi scope/departmentId qua update — phải clone")
    void updateRejectsScopeOrDepartmentChange() {
        when(repository.require("pos-1", ORG, true))
            .thenReturn(stored("pos-1", "DEPARTMENT", "dept-1", Set.of("employee.view")));

        assertThatThrownBy(() -> service.update("pos-1", new PositionRequest(
            "Chức danh", null, Set.of("employee.view"), Set.of(), "DEPARTMENT", "dept-2")))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("Owner sửa được chức danh mẫu dùng chung")
    void ownerCanUpdateSharedTemplate() {
        when(repository.require("pos-shared", ORG, true))
            .thenReturn(stored("pos-shared", "DEPARTMENT", null, Set.of("employee.view")));

        PositionResponse updated = service.update("pos-shared", new PositionRequest(
            "Giáo viên", null, Set.of("employee.view"), Set.of(), "DEPARTMENT", null));

        assertThat(updated.name()).isEqualTo("Giáo viên");
        assertThat(updated.departmentId()).isNull();
    }

    @Test
    @DisplayName("Non-owner không xóa được chức danh mẫu dùng chung")
    void nonOwnerCannotDeleteSharedTemplate() {
        nonOwner();
        when(repository.require("pos-shared", ORG, true))
            .thenReturn(stored("pos-shared", "DEPARTMENT", null, Set.of("employee.view")));

        assertThatThrownBy(() -> service.delete("pos-shared"))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("FORBIDDEN"));
    }

    @Test
    @DisplayName("Nhân bản giữ loại hồ sơ TEACHER của chức danh gốc")
    void cloneKeepsProfileType() {
        when(repository.require("pos-teacher", ORG, false)).thenReturn(new PositionResponse(
            "pos-teacher", "Giáo viên", "Giáo viên giảng dạy", Instant.now(),
            Set.of("class.self_view"), "TEACHER", Set.of(), "DEPARTMENT", null));

        PositionCloneResponse result = service.clone("pos-teacher",
            new PositionCloneRequest("Giáo viên bộ môn", "dept-1"));

        assertThat(result.position().profileType()).isEqualTo("TEACHER");
        assertThat(result.position().departmentId()).isEqualTo("dept-1");
    }

    @Test
    @DisplayName("Non-owner không clone chức danh cấp ORGANIZATION")
    void nonOwnerCannotCloneOrganizationPosition() {
        nonOwner();
        when(repository.require("pos-org", ORG, false))
            .thenReturn(stored("pos-org", "ORGANIZATION", null, Set.of("employee.view")));

        assertThatThrownBy(() -> service.clone("pos-org",
            new PositionCloneRequest("Bản sao", "dept-1")))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("FORBIDDEN"));
    }
}
