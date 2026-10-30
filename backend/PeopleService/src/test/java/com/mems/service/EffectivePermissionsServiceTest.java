package com.mems.service;

import com.mems.client.IdentityClient;
import com.mems.dto.PermissionResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EffectivePermissionsServiceTest {

    @Mock
    private JdbcTemplate jdbc;

    @Mock
    private IdentityClient identityClient;

    private EffectivePermissionsService service;

    @BeforeEach
    void setUp() {
        service = new EffectivePermissionsService(jdbc, identityClient);

        // Catalog of permissions
        when(identityClient.permissions()).thenReturn(List.of(
            new PermissionResponse("PEOPLE_VIEW", "View department members", null),
            new PermissionResponse("PEOPLE_EDIT", "Manage department members", null),
            new PermissionResponse("STUDENT_VIEW", "View students", "STUDENT_MANAGEMENT"),
            new PermissionResponse("STUDENT_EDIT", "Edit students", "STUDENT_MANAGEMENT"),
            new PermissionResponse("CLASS_VIEW", "View classes", "STUDENT_MANAGEMENT")
        ));
    }

    @Test
    @DisplayName("Old permissions with null moduleCode are always retained")
    void oldPermissionsRetainedWithoutModules() {
        // Department has NO modules
        when(jdbc.queryForList(anyString(), eq(String.class), eq("dept-1"), eq("org-1")))
            .thenReturn(List.of());

        Set<String> raw = Set.of("PEOPLE_VIEW", "PEOPLE_EDIT", "STUDENT_VIEW");
        Set<String> effective = service.compute("org-1", "dept-1", raw);

        assertThat(effective).containsExactlyInAnyOrder("PEOPLE_VIEW", "PEOPLE_EDIT");
        assertThat(effective).doesNotContain("STUDENT_VIEW");
    }

    @Test
    @DisplayName("Module permissions are retained when department has that module")
    void modulePermissionsRetainedWhenDepartmentHasModule() {
        // Department has STUDENT_MANAGEMENT
        when(jdbc.queryForList(anyString(), eq(String.class), eq("dept-1"), eq("org-1")))
            .thenReturn(List.of("STUDENT_MANAGEMENT"));

        Set<String> raw = Set.of("PEOPLE_VIEW", "STUDENT_VIEW", "STUDENT_EDIT");
        Set<String> effective = service.compute("org-1", "dept-1", raw);

        assertThat(effective).containsExactlyInAnyOrder("PEOPLE_VIEW", "STUDENT_VIEW", "STUDENT_EDIT");
    }

    @Test
    @DisplayName("Null departmentId keeps only unassigned permissions")
    void nullDepartmentKeepsOnlyGlobalPermissions() {
        Set<String> raw = Set.of("PEOPLE_VIEW", "STUDENT_VIEW");
        Set<String> effective = service.compute("org-1", null, raw);

        assertThat(effective).containsExactlyInAnyOrder("PEOPLE_VIEW");
    }
}

