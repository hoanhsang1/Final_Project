package com.mems.service;

import com.mems.dto.MemberResponse;
import com.mems.dto.PositionResponse;
import com.mems.exception.ApiException;
import com.mems.repository.MemberRepository;
import com.mems.repository.PositionRepository;
import com.mems.security.Actor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MembershipPolicyTest {

    @Mock
    private Actor actor;

    @Mock
    private MemberRepository members;

    @Mock
    private PositionRepository positions;

    @Mock
    private JdbcTemplate jdbc;

    @Mock
    private EffectivePermissionsService effectivePermissions;

    private MembershipPolicy policy;

    @BeforeEach
    void setUp() {
        policy = new MembershipPolicy(actor, members, positions, jdbc, effectivePermissions);
    }

    @Test
    @DisplayName("Manager assigning position with permission outside department module throws PERMISSION_OUT_OF_MODULE")
    void managerAssigningOutOfModulePermissionThrows403() {
        when(actor.orgId()).thenReturn("org-1");
        when(actor.userId()).thenReturn("manager-user-id");
        when(actor.owner()).thenReturn(false);

        MemberResponse managerMember = new MemberResponse(
            "manager-user-id", "dept-1", "MANAGER", "owner-id", Instant.now(),
            Set.of("pos-manager"), Set.of("PEOPLE_EDIT", "PEOPLE_VIEW")
        );
        when(members.require("manager-user-id", "org-1", "dept-1", true)).thenReturn(managerMember);
        when(members.positionIds("manager-user-id", true)).thenReturn(Set.of("pos-manager"));

        // Position lookup
        when(positions.require(eq("pos-manager"), eq("org-1"), eq(true))).thenReturn(null);
        when(positions.require(eq("pos-staff-student"), eq("org-1"), eq(true))).thenReturn(null);

        // Grants
        when(jdbc.queryForList(anyString(), eq(String.class), eq("pos-manager")))
            .thenReturn(List.of("PEOPLE_EDIT", "PEOPLE_VIEW"));
        when(jdbc.queryForList(anyString(), eq(String.class), eq("pos-staff-student")))
            .thenReturn(List.of("STUDENT_EDIT"));

        // Department has no STUDENT_MANAGEMENT module
        when(effectivePermissions.departmentModules("org-1", "dept-1")).thenReturn(Set.of());
        Map<String, String> permMap = new HashMap<>();
        permMap.put("PEOPLE_EDIT", null);
        permMap.put("PEOPLE_VIEW", null);
        permMap.put("STUDENT_EDIT", "STUDENT_MANAGEMENT");
        when(effectivePermissions.permissionModuleMap()).thenReturn(permMap);
        when(effectivePermissions.compute("org-1", "dept-1", Set.of("PEOPLE_EDIT", "PEOPLE_VIEW")))
            .thenReturn(Set.of("PEOPLE_EDIT", "PEOPLE_VIEW"));

        assertThatThrownBy(() -> policy.check("dept-1", "STAFF", Set.of("pos-staff-student")))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> {
                ApiException apiEx = (ApiException) ex;
                assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
                assertThat(apiEx.getCode()).isEqualTo("PERMISSION_OUT_OF_MODULE");
            });
    }

    @Test
    @DisplayName("Manager assigning permissions beyond their own permissions throws FORBIDDEN")
    void managerAssigningBeyondOwnPermissionsThrowsForbidden() {
        when(actor.orgId()).thenReturn("org-1");
        when(actor.userId()).thenReturn("manager-user-id");
        when(actor.owner()).thenReturn(false);

        MemberResponse managerMember = new MemberResponse(
            "manager-user-id", "dept-1", "MANAGER", "owner-id", Instant.now(),
            Set.of("pos-manager"), Set.of("PEOPLE_VIEW") // No PEOPLE_EDIT
        );
        when(members.require("manager-user-id", "org-1", "dept-1", true)).thenReturn(managerMember);
        when(members.positionIds("manager-user-id", true)).thenReturn(Set.of("pos-manager"));

        when(positions.require(eq("pos-manager"), eq("org-1"), eq(true))).thenReturn(null);
        when(positions.require(eq("pos-staff"), eq("org-1"), eq(true))).thenReturn(null);

        when(jdbc.queryForList(anyString(), eq(String.class), eq("pos-manager")))
            .thenReturn(List.of("PEOPLE_VIEW"));
        when(jdbc.queryForList(anyString(), eq(String.class), eq("pos-staff")))
            .thenReturn(List.of("PEOPLE_VIEW"));

        when(effectivePermissions.departmentModules("org-1", "dept-1")).thenReturn(Set.of());
        Map<String, String> permMap = new HashMap<>();
        permMap.put("PEOPLE_VIEW", null);
        when(effectivePermissions.permissionModuleMap()).thenReturn(permMap);
        when(effectivePermissions.compute("org-1", "dept-1", Set.of("PEOPLE_VIEW")))
            .thenReturn(Set.of("PEOPLE_VIEW"));

        when(actor.forbidden(anyString())).thenReturn(new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Cannot assign permissions beyond your current permissions"));

        assertThatThrownBy(() -> policy.check("dept-1", "STAFF", Set.of("pos-staff")))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> {
                ApiException apiEx = (ApiException) ex;
                assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
                assertThat(apiEx.getCode()).isEqualTo("FORBIDDEN");
            });
    }
}
