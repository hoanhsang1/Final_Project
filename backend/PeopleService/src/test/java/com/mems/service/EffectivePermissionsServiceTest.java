package com.mems.service;

import com.mems.client.IdentityClient;
import com.mems.dto.PermissionBundleResponse;
import com.mems.dto.PermissionResponse;
import com.mems.repository.AssignmentRepository;
import com.mems.repository.PositionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.ResultSet;
import java.sql.Timestamp;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.jdbc.core.RowCallbackHandler;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class EffectivePermissionsServiceTest {

    @Mock
    private JdbcTemplate jdbc;

    @Mock
    private IdentityClient identityClient;

    @Mock
    private AssignmentRepository assignments;

    @Mock
    private PositionRepository positions;

    private EffectivePermissionsService service;

    @BeforeEach
    void setUp() {
        service = new EffectivePermissionsService(jdbc, identityClient, assignments, positions);

        when(identityClient.permissions()).thenReturn(List.of(
            new PermissionResponse("employee.view", "View employees", null),
            new PermissionResponse("employee.edit", "Edit employees", null),
            new PermissionResponse("position.view", "View positions", null),
            new PermissionResponse("student.view", "View students", "STUDENT_MANAGEMENT",
                Set.of("ORGANIZATION")),
            new PermissionResponse("class.view", "View classes", "STUDENT_MANAGEMENT",
                Set.of("ORGANIZATION")),
            new PermissionResponse("schedule.view", "View schedules", null)
        ));
        when(identityClient.permissionBundles()).thenReturn(List.of(
            new PermissionBundleResponse("HR_MANAGEMENT", "Quản lý nhân sự", "HR",
                Set.of("employee.view", "position.view"), Set.of("ORGANIZATION", "DEPARTMENT"))
        ));
        when(positions.bundleCodes(anyString())).thenReturn(Set.of());
    }

    @Test
    @DisplayName("Quyền không thuộc module nào (moduleCode null) luôn được giữ")
    void permissionsWithoutModuleAreAlwaysRetained() {
        when(jdbc.queryForList(anyString(), eq(String.class), eq("dept-1"), eq("org-1")))
            .thenReturn(List.of());

        Set<String> effective = service.compute("org-1", "dept-1",
            Set.of("employee.view", "employee.edit", "student.view"));

        assertThat(effective).containsExactlyInAnyOrder("employee.view", "employee.edit");
        assertThat(effective).doesNotContain("student.view");
    }

    @Test
    @DisplayName("Quyền thuộc module được giữ khi phòng ban bật module đó")
    void modulePermissionsRetainedWhenDepartmentHasModule() {
        when(jdbc.queryForList(anyString(), eq(String.class), eq("dept-1"), eq("org-1")))
            .thenReturn(List.of("STUDENT_MANAGEMENT"));

        Set<String> effective = service.compute("org-1", "dept-1",
            Set.of("employee.view", "student.view"));

        assertThat(effective).containsExactlyInAnyOrder("employee.view", "student.view");
    }

    @Test
    @DisplayName("DoD: nhân viên giữ 2 chức vụ ACTIVE nhận HỢP quyền của cả hai")
    void effectivePermissionsAreUnionOfActivePositions() {
        when(jdbc.queryForList(anyString(), eq(String.class), eq("dept-1"), eq("org-1")))
            .thenReturn(List.of("STUDENT_MANAGEMENT"));
        when(assignments.active("user-1", "org-1")).thenReturn(List.of(
            new AssignmentRepository.ActiveAssignment("pos-employee", "ORGANIZATION", null),
            new AssignmentRepository.ActiveAssignment("pos-class", "ORGANIZATION", null)
        ));
        when(positions.permissions("pos-employee")).thenReturn(Set.of("employee.view"));
        when(positions.permissions("pos-class")).thenReturn(Set.of("class.view"));

        var effective = service.resolve("org-1", "user-1", "dept-1");

        assertThat(effective.permissions()).containsExactlyInAnyOrder("employee.view", "class.view");
        assertThat(effective.scopes().get("employee.view")).containsExactly("ORGANIZATION");
        assertThat(effective.scopes().get("class.view")).containsExactly("ORGANIZATION");
    }

    @Test
    @DisplayName("DoD: assignment phạm vi DEPARTMENT của phòng ban khác KHÔNG cấp quyền")
    void departmentScopeOfAnotherDepartmentIsIgnored() {
        when(jdbc.queryForList(anyString(), eq(String.class), eq("dept-1"), eq("org-1")))
            .thenReturn(List.of());
        when(assignments.active("user-1", "org-1")).thenReturn(List.of(
            new AssignmentRepository.ActiveAssignment("pos-other", "DEPARTMENT", "dept-2")
        ));
        when(positions.permissions("pos-other")).thenReturn(Set.of("employee.view"));

        var effective = service.resolve("org-1", "user-1", "dept-1");

        assertThat(effective.permissions()).isEmpty();
        assertThat(effective.scopes()).isEmpty();
    }

    @Test
    @DisplayName("Assignment phạm vi DEPARTMENT của đúng phòng ban cấp token DEPARTMENT:<id>")
    void departmentScopeOfOwnDepartmentGrantsDepartmentToken() {
        when(jdbc.queryForList(anyString(), eq(String.class), eq("dept-1"), eq("org-1")))
            .thenReturn(List.of());
        when(assignments.active("user-1", "org-1")).thenReturn(List.of(
            new AssignmentRepository.ActiveAssignment("pos-hr", "DEPARTMENT", "dept-1")
        ));
        when(positions.permissions("pos-hr")).thenReturn(Set.of("employee.view"));

        var effective = service.resolve("org-1", "user-1", "dept-1");

        assertThat(effective.permissions()).containsExactly("employee.view");
        assertThat(effective.scopes().get("employee.view")).containsExactly("DEPARTMENT:dept-1");
    }

    @Test
    @DisplayName("Quyền chỉ cho phép ORGANIZATION bị loại khỏi chức vụ phạm vi DEPARTMENT")
    void organizationOnlyPermissionIsDroppedForDepartmentScope() {
        when(jdbc.queryForList(anyString(), eq(String.class), eq("dept-1"), eq("org-1")))
            .thenReturn(List.of("STUDENT_MANAGEMENT"));
        when(assignments.active("user-1", "org-1")).thenReturn(List.of(
            new AssignmentRepository.ActiveAssignment("pos-class", "DEPARTMENT", "dept-1")
        ));
        when(positions.permissions("pos-class")).thenReturn(Set.of("class.view"));

        var effective = service.resolve("org-1", "user-1", "dept-1");

        assertThat(effective.permissions()).doesNotContain("class.view");
    }

    @Test
    @DisplayName("Gói quyền gắn vào chức vụ được mở rộng thành từng mã quyền")
    void bundlePermissionsAreExpanded() {
        when(jdbc.queryForList(anyString(), eq(String.class), eq("dept-1"), eq("org-1")))
            .thenReturn(List.of());
        when(assignments.active("user-1", "org-1")).thenReturn(List.of(
            new AssignmentRepository.ActiveAssignment("pos-hr", "ORGANIZATION", null)
        ));
        when(positions.permissions("pos-hr")).thenReturn(Set.of());
        when(positions.bundleCodes("pos-hr")).thenReturn(Set.of("HR_MANAGEMENT"));

        var effective = service.resolve("org-1", "user-1", "dept-1");

        assertThat(effective.permissions()).containsExactlyInAnyOrder("employee.view", "position.view");
        assertThat(effective.scopes()).containsKeys("employee.view", "position.view");
        assertThat(effective.scopes().get("employee.view")).containsExactly("ORGANIZATION");
    }

    @Test
    @DisplayName("DoD: quyền ủy quyền đang hiệu lực vào quyền hiệu lực và được đánh dấu delegated")
    void activeDelegationGrantsAreAddedAndMarked() {
        when(jdbc.queryForList(anyString(), eq(String.class), eq("dept-1"), eq("org-1")))
            .thenReturn(List.of());
        when(assignments.active("gm-1", "org-1")).thenReturn(List.of());
        doAnswer(invocation -> {
            RowCallbackHandler handler = invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getString("permission_code")).thenReturn("employee.view");
            when(rs.getString("id")).thenReturn("delegation-1");
            handler.processRow(rs);
            return null;
        }).when(jdbc).query(contains("JOIN delegation_permission"),
            any(RowCallbackHandler.class), eq("org-1"), eq("gm-1"),
            any(Timestamp.class), any(Timestamp.class));

        var effective = service.resolve("org-1", "gm-1", "dept-1");

        assertThat(effective.permissions()).containsExactly("employee.view");
        assertThat(effective.delegatedPermissions()).containsExactly("employee.view");
        assertThat(effective.scopes().get("employee.view")).containsExactly("ORGANIZATION");
    }

    @Test
    @DisplayName("Quyền ủy quyền không cho phép ORGANIZATION thì bị bỏ qua")
    void delegationGrantWithoutOrganizationScopeIsDropped() {
        when(identityClient.permissions()).thenReturn(List.of(
            new PermissionResponse("schedule.manage", "Manage schedules", "SCHEDULE_MANAGEMENT",
                Set.of("DEPARTMENT"))
        ));
        when(jdbc.queryForList(anyString(), eq(String.class), eq("dept-1"), eq("org-1")))
            .thenReturn(List.of("SCHEDULE_MANAGEMENT"));
        when(assignments.active("gm-1", "org-1")).thenReturn(List.of());
        doAnswer(invocation -> {
            RowCallbackHandler handler = invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getString("permission_code")).thenReturn("schedule.manage");
            when(rs.getString("id")).thenReturn("delegation-1");
            handler.processRow(rs);
            return null;
        }).when(jdbc).query(contains("JOIN delegation_permission"),
            any(RowCallbackHandler.class), eq("org-1"), eq("gm-1"),
            any(Timestamp.class), any(Timestamp.class));

        var effective = service.resolve("org-1", "gm-1", "dept-1");

        assertThat(effective.permissions()).doesNotContain("schedule.manage");
        assertThat(effective.delegatedPermissions()).isEmpty();
    }

    @Test
    @DisplayName("Nhân viên không có assignment ACTIVE nào → không có quyền hiệu lực")
    void noActiveAssignmentYieldsNoPermissions() {
        when(jdbc.queryForList(anyString(), eq(String.class), eq("dept-1"), eq("org-1")))
            .thenReturn(List.of());
        when(assignments.active("user-1", "org-1")).thenReturn(List.of());

        var effective = service.resolve("org-1", "user-1", "dept-1");

        assertThat(effective.permissions()).isEmpty();
        assertThat(effective.scopes()).isEqualTo(Map.of());
    }
}
