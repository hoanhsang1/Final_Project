package com.mems.controller;

import com.mems.client.IdentityClient;
import com.mems.dto.MemberResponse;
import com.mems.dto.PermissionResponse;
import com.mems.repository.MemberRepository;
import com.mems.security.Actor;
import com.mems.service.EffectivePermissionsService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class EffectivePermissionControllerTest {

    @Mock
    private Actor actor;

    @Mock
    private MemberRepository members;

    @Mock
    private EffectivePermissionsService effectivePermissions;

    @Mock
    private IdentityClient identity;

    @InjectMocks
    private EffectivePermissionController controller;

    @Test
    @DisplayName("Xem quyền hiệu lực của chính mình: hợp quyền + phạm vi theo phòng ban")
    void selfReturnsResolvedPermissionsWithScopes() {
        when(actor.orgId()).thenReturn("org-1");
        when(actor.userId()).thenReturn("user-1");
        when(members.findDepartmentId("user-1", "org-1")).thenReturn(Optional.of("dept-1"));
        when(effectivePermissions.resolve("org-1", "user-1", "dept-1"))
            .thenReturn(new EffectivePermissionsService.EffectivePermissions(
                Set.of("employee.view"),
                Map.of("employee.view", Set.of("DEPARTMENT:dept-1"))));

        var response = controller.me();

        assertThat(response.userId()).isEqualTo("user-1");
        assertThat(response.orgId()).isEqualTo("org-1");
        assertThat(response.departmentId()).isEqualTo("dept-1");
        assertThat(response.permissions()).containsExactly("employee.view");
        assertThat(response.permissionScopes().get("employee.view"))
            .containsExactly("DEPARTMENT:dept-1");
    }

    @Test
    @DisplayName("OWNER không thuộc phòng ban: trả toàn bộ catalog với phạm vi ORGANIZATION")
    void ownerWithoutDepartmentReceivesFullCatalog() {
        when(actor.orgId()).thenReturn("org-1");
        when(actor.userId()).thenReturn("owner-1");
        when(members.findDepartmentId("owner-1", "org-1")).thenReturn(Optional.empty());
        when(actor.owner()).thenReturn(true);
        when(identity.permissions()).thenReturn(List.of(
            new PermissionResponse("employee.view", "View employees", null, Set.of("ORGANIZATION")),
            new PermissionResponse("class.view", "View classes", "STUDENT_MANAGEMENT", Set.of("ORGANIZATION"))
        ));

        var response = controller.me();

        assertThat(response.departmentId()).isNull();
        assertThat(response.permissions()).containsExactlyInAnyOrder("employee.view", "class.view");
        assertThat(response.permissionScopes().get("employee.view")).containsExactly("ORGANIZATION");
    }

    @Test
    @DisplayName("Người có quyền xem nhân viên đọc được quyền hiệu lực của nhân viên cùng phòng/tổ chức")
    void authorizedViewerReadsMemberPermissions() {
        when(actor.orgId()).thenReturn("org-1");
        when(members.require("user-2", "org-1", "dept-1", false)).thenReturn(new MemberResponse(
            "user-2", "nhanvien02", "dept-1", "STAFF", "ACTIVE", "owner-1", Instant.now(),
            Set.of("pos-staff"), Set.of("employee.view")));
        when(effectivePermissions.resolve("org-1", "user-2", "dept-1"))
            .thenReturn(new EffectivePermissionsService.EffectivePermissions(
                Set.of("employee.view"),
                Map.of("employee.view", Set.of("DEPARTMENT:dept-1"))));

        var response = controller.member("dept-1", "user-2");

        assertThat(response.userId()).isEqualTo("user-2");
        assertThat(response.departmentId()).isEqualTo("dept-1");
        assertThat(response.permissionScopes().get("employee.view"))
            .containsExactly("DEPARTMENT:dept-1");
    }
}
