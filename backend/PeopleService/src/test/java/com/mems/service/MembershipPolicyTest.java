package com.mems.service;

import com.mems.dto.PositionResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
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
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MembershipPolicyTest {

    @Mock
    private Actor actor;

    @Mock
    private PositionRepository positions;

    @Mock
    private EffectivePermissionsService effectivePermissions;

    private MembershipPolicy policy;

    @BeforeEach
    void setUp() {
        policy = new MembershipPolicy(actor, positions, effectivePermissions);
        when(positions.require(anyString(), eq("org-1"), eq(true))).thenReturn(new PositionResponse(
            "pos-staff", "Nhân viên", null, Instant.now(), Set.of(), "GENERAL",
            Set.of(), "DEPARTMENT", "dept-1"));
    }

    @Test
    @DisplayName("Người không phải Owner không được gán chức danh phạm vi ORGANIZATION")
    void managerCannotAssignOrganizationPosition() {
        when(actor.orgId()).thenReturn("org-1");
        when(actor.owner()).thenReturn(false);
        when(positions.require("pos-org", "org-1", true)).thenReturn(new PositionResponse(
            "pos-org", "Tổng quản lý", null, Instant.now(), Set.of("employee.view"), "GENERAL",
            Set.of("HR_MANAGEMENT"), "ORGANIZATION", null));
        when(actor.forbidden(anyString()))
            .thenReturn(new AppException(ErrorCode.FORBIDDEN, "Only the organization owner can assign"));

        assertThatThrownBy(() -> policy.check("dept-1", "STAFF", Set.of("pos-org")))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    @DisplayName("Gán chức vụ có quyền ngoài module phòng ban → PERMISSION_OUT_OF_MODULE")
    void managerAssigningOutOfModulePermissionThrows403() {
        when(actor.orgId()).thenReturn("org-1");
        when(actor.userId()).thenReturn("manager-user-id");
        when(actor.owner()).thenReturn(false);

        // Quyền hiệu lực của người gán: có employee.assign_position + student.edit
        when(effectivePermissions.resolve("org-1", "manager-user-id", "dept-1"))
            .thenReturn(new EffectivePermissionsService.EffectivePermissions(
                Set.of("employee.assign_position", "student.edit"), Map.of()));
        // Chức vụ định gán mang student.edit
        when(effectivePermissions.expandPositions("org-1", Set.of("pos-staff-student")))
            .thenReturn(Set.of("student.edit"));

        // Phòng ban KHÔNG bật STUDENT_MANAGEMENT
        when(effectivePermissions.departmentModules("org-1", "dept-1")).thenReturn(Set.of());
        Map<String, String> permMap = new HashMap<>();
        permMap.put("employee.assign_position", null);
        permMap.put("student.edit", "STUDENT_MANAGEMENT");
        when(effectivePermissions.permissionModuleMap()).thenReturn(permMap);

        assertThatThrownBy(() -> policy.check("dept-1", "STAFF", Set.of("pos-staff-student")))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> {
                AppException apiEx = (AppException) ex;
                assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
                assertThat(apiEx.getCode()).isEqualTo("PERMISSION_OUT_OF_MODULE");
            });
    }

    @Test
    @DisplayName("Gán chức vụ có quyền vượt quá quyền hiệu lực của mình → FORBIDDEN")
    void managerAssigningBeyondOwnPermissionsThrowsForbidden() {
        when(actor.orgId()).thenReturn("org-1");
        when(actor.userId()).thenReturn("manager-user-id");
        when(actor.owner()).thenReturn(false);

        // Có quyền gán chức vụ nhưng chức vụ đích mang thêm employee.delete
        when(effectivePermissions.resolve("org-1", "manager-user-id", "dept-1"))
            .thenReturn(new EffectivePermissionsService.EffectivePermissions(
                Set.of("employee.assign_position"), Map.of()));
        when(effectivePermissions.expandPositions("org-1", Set.of("pos-staff")))
            .thenReturn(Set.of("employee.delete"));

        when(effectivePermissions.departmentModules("org-1", "dept-1")).thenReturn(Set.of());
        Map<String, String> permMap = new HashMap<>();
        permMap.put("employee.assign_position", null);
        permMap.put("employee.delete", null);
        when(effectivePermissions.permissionModuleMap()).thenReturn(permMap);

        when(actor.forbidden(anyString()))
            .thenReturn(new AppException(ErrorCode.FORBIDDEN, "Cannot assign permissions beyond your current permissions"));

        assertThatThrownBy(() -> policy.check("dept-1", "STAFF", Set.of("pos-staff")))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> {
                AppException apiEx = (AppException) ex;
                assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
                assertThat(apiEx.getCode()).isEqualTo("FORBIDDEN");
            });
    }

    @Test
    @DisplayName("Người gán thiếu employee.assign_position → FORBIDDEN")
    void managerWithoutAssignPositionThrowsForbidden() {
        when(actor.orgId()).thenReturn("org-1");
        when(actor.userId()).thenReturn("manager-user-id");
        when(actor.owner()).thenReturn(false);
        when(effectivePermissions.resolve("org-1", "manager-user-id", "dept-1"))
            .thenReturn(new EffectivePermissionsService.EffectivePermissions(
                Set.of("employee.view"), Map.of()));
        when(actor.forbidden(anyString()))
            .thenReturn(new AppException(ErrorCode.FORBIDDEN, "Missing permission: employee.assign_position"));

        assertThatThrownBy(() -> policy.check("dept-1", "STAFF", Set.of("pos-staff")))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("FORBIDDEN"));
    }
}
