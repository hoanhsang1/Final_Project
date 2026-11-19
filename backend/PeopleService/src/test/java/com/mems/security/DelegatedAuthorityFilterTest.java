package com.mems.security;

import com.mems.service.EffectivePermissionsService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DelegatedAuthorityFilterTest {

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private Jwt token(List<String> permissions, List<String> delegated) {
        return Jwt.withTokenValue("token")
            .header("alg", "HS256")
            .claim("sub", "gm-1")
            .claim("orgId", "org-1")
            .claim("permissions", permissions)
            .claim("delegatedPermissions", delegated)
            .claim("permissionScopes", Map.of(
                "employee.view", List.of("ORGANIZATION"),
                "class.view", List.of("ORGANIZATION")))
            .issuedAt(Instant.now().minusSeconds(60))
            .expiresAt(Instant.now().plusSeconds(600))
            .build();
    }

    private Jwt employeeToken(String role, List<String> permissions) {
        return Jwt.withTokenValue("token")
            .header("alg", "HS256")
            .claim("sub", "gm-1")
            .claim("orgId", "org-1")
            .claim("role", role)
            .claim("permissions", permissions)
            .claim("delegatedPermissions", List.of())
            .claim("permissionScopes", Map.of())
            .issuedAt(Instant.now().minusSeconds(60))
            .expiresAt(Instant.now().plusSeconds(600))
            .build();
    }

    @SuppressWarnings("unchecked")
    private Set<String> positionPermissions(MockHttpServletRequest request) {
        return (Set<String>) request.getAttribute(
            DelegatedAuthorityFilter.POSITION_PERMISSIONS_ATTRIBUTE);
    }

    private Set<String> authorities() {
        return current().getAuthorities().stream()
            .map(a -> a.getAuthority()).collect(Collectors.toSet());
    }

    private void authenticate(Jwt jwt, String... authorities) {
        var auth = new JwtAuthenticationToken(jwt,
            Set.of(authorities).stream().map(SimpleGrantedAuthority::new).collect(Collectors.toSet()),
            "gm-1");
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private JwtAuthenticationToken current() {
        return (JwtAuthenticationToken) SecurityContextHolder.getContext().getAuthentication();
    }

    @Test
    @DisplayName("DoD: ủy quyền bị thu hồi mất hiệu lực ngay ở request kế tiếp")
    void revokedDelegationIsRemovedFromAuthorities() throws Exception {
        var effective = mock(EffectivePermissionsService.class);
        when(effective.activeDelegationGrants("org-1", "gm-1")).thenReturn(Map.of());
        authenticate(token(List.of("employee.view", "class.view"), List.of("class.view")),
            "ROLE_STAFF", "employee.view", "class.view");

        new DelegatedAuthorityFilter(effective).doFilter(
            new MockHttpServletRequest(), new MockHttpServletResponse(), new MockFilterChain());

        Set<String> authorities = current().getAuthorities().stream()
            .map(a -> a.getAuthority()).collect(Collectors.toSet());
        assertThat(authorities).contains("ROLE_STAFF", "employee.view").doesNotContain("class.view");
        assertThat(current().getToken().getClaimAsStringList("permissions")).containsExactly("employee.view");
        assertThat(current().getToken().getClaimAsStringList("delegatedPermissions")).isEmpty();
    }

    @Test
    @DisplayName("Ủy quyền mới có hiệu lực ngay: thêm authority + scope ORGANIZATION")
    void newDelegationIsAddedImmediately() throws Exception {
        var effective = mock(EffectivePermissionsService.class);
        when(effective.activeDelegationGrants("org-1", "gm-1"))
            .thenReturn(Map.of("student.view", "delegation-1"));
        authenticate(token(List.of("employee.view"), List.of()),
            "ROLE_MANAGER", "employee.view");

        var request = new MockHttpServletRequest();
        new DelegatedAuthorityFilter(effective).doFilter(
            request, new MockHttpServletResponse(), new MockFilterChain());

        Set<String> authorities = current().getAuthorities().stream()
            .map(a -> a.getAuthority()).collect(Collectors.toSet());
        assertThat(authorities).contains("ROLE_MANAGER", "employee.view", "student.view");
        assertThat(current().getToken().getClaimAsStringList("delegatedPermissions"))
            .containsExactly("student.view");
        assertThat(request.getAttribute(DelegatedAuthorityFilter.GRANTS_ATTRIBUTE))
            .isEqualTo(Map.of("student.view", "delegation-1"));
    }

    @Test
    @DisplayName("Quyền đến từ chức vụ không bị filter đụng tới")
    void positionPermissionsArePreserved() throws Exception {
        var effective = mock(EffectivePermissionsService.class);
        when(effective.activeDelegationGrants("org-1", "gm-1")).thenReturn(Map.of());
        authenticate(token(List.of("employee.view"), List.of()),
            "ROLE_STAFF", "employee.view");

        new DelegatedAuthorityFilter(effective).doFilter(
            new MockHttpServletRequest(), new MockHttpServletResponse(), new MockFilterChain());

        assertThat(current().getToken().getClaimAsStringList("permissions"))
            .containsExactly("employee.view");
        assertThat(current().getToken().getClaimAsStringList("delegatedPermissions")).isEmpty();
    }

    // ------------------------------------------------ RBAC-05 recompute tests

    @Test
    @DisplayName("RBAC-05: MANAGER/STAFF nhận quyền từ DB, không tin token cũ")
    void employeePermissionsAreRecomputedFromDatabase() throws Exception {
        var effective = mock(EffectivePermissionsService.class);
        when(effective.activeMember("org-1", "gm-1")).thenReturn(true);
        when(effective.resolve("org-1", "gm-1")).thenReturn(
            new EffectivePermissionsService.EffectivePermissions(
                Set.of("employee.view"), Map.of("employee.view", Set.of("DEPARTMENT:dept-1")), Set.of()));
        authenticate(employeeToken("STAFF", List.of("employee.view", "employee.edit")),
            "ROLE_STAFF", "employee.view", "employee.edit");

        var request = new MockHttpServletRequest();
        new DelegatedAuthorityFilter(effective).doFilter(
            request, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(authorities()).contains("ROLE_STAFF", "employee.view")
            .doesNotContain("employee.edit");
        assertThat(current().getToken().getClaimAsStringList("permissions"))
            .containsExactly("employee.view");
        assertThat((Object) current().getToken().getClaim("permissionScopes"))
            .isEqualTo(Map.of("employee.view", List.of("DEPARTMENT:dept-1")));
        assertThat(positionPermissions(request)).containsExactly("employee.view");
    }

    @Test
    @DisplayName("RBAC-05: thu hồi assignment có hiệu lực ngay ở request kế tiếp")
    void revokedAssignmentRemovesPermissionImmediately() throws Exception {
        var effective = mock(EffectivePermissionsService.class);
        when(effective.activeMember("org-1", "gm-1")).thenReturn(true);
        when(effective.resolve("org-1", "gm-1")).thenReturn(
            new EffectivePermissionsService.EffectivePermissions(Set.of(), Map.of()));
        authenticate(employeeToken("MANAGER", List.of("employee.view")),
            "ROLE_MANAGER", "employee.view");

        new DelegatedAuthorityFilter(effective).doFilter(
            new MockHttpServletRequest(), new MockHttpServletResponse(), new MockFilterChain());

        assertThat(authorities()).contains("ROLE_MANAGER").doesNotContain("employee.view");
        assertThat(current().getToken().getClaimAsStringList("permissions")).isEmpty();
    }

    @Test
    @DisplayName("RBAC-05: quyền độc quyền ủy quyền vẫn được đánh dấu delegated")
    void delegatedOnlyPermissionIsMarked() throws Exception {
        var effective = mock(EffectivePermissionsService.class);
        when(effective.activeMember("org-1", "gm-1")).thenReturn(true);
        when(effective.resolve("org-1", "gm-1")).thenReturn(
            new EffectivePermissionsService.EffectivePermissions(
                Set.of("employee.view", "student.view"),
                Map.of("employee.view", Set.of("ORGANIZATION"),
                    "student.view", Set.of("ORGANIZATION")),
                Set.of("student.view")));
        authenticate(employeeToken("STAFF", List.of("employee.view")),
            "ROLE_STAFF", "employee.view");

        var request = new MockHttpServletRequest();
        new DelegatedAuthorityFilter(effective).doFilter(
            request, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(current().getToken().getClaimAsStringList("permissions"))
            .containsExactly("employee.view", "student.view");
        assertThat(current().getToken().getClaimAsStringList("delegatedPermissions"))
            .containsExactly("student.view");
        assertThat(positionPermissions(request)).containsExactly("employee.view");
    }

    @Test
    @DisplayName("RBAC-05: membership không ACTIVE ⇒ mất toàn bộ quyền (fail-closed)")
    void inactiveMemberLosesAllPermissions() throws Exception {
        var effective = mock(EffectivePermissionsService.class);
        when(effective.activeMember("org-1", "gm-1")).thenReturn(false);
        authenticate(employeeToken("STAFF", List.of("employee.view")),
            "ROLE_STAFF", "employee.view");

        new DelegatedAuthorityFilter(effective).doFilter(
            new MockHttpServletRequest(), new MockHttpServletResponse(), new MockFilterChain());

        assertThat(authorities()).contains("ROLE_STAFF").doesNotContain("employee.view");
        assertThat((Boolean) current().getToken().getClaim("permissionsStale")).isTrue();
    }

    @Test
    @DisplayName("RBAC-05: resolve lỗi ⇒ fail-closed, không fallback token")
    void resolveFailureFailsClosed() throws Exception {
        var effective = mock(EffectivePermissionsService.class);
        when(effective.activeMember("org-1", "gm-1")).thenReturn(true);
        when(effective.resolve("org-1", "gm-1")).thenThrow(new IllegalStateException("identity down"));
        authenticate(employeeToken("STAFF", List.of("employee.view")),
            "ROLE_STAFF", "employee.view");

        new DelegatedAuthorityFilter(effective).doFilter(
            new MockHttpServletRequest(), new MockHttpServletResponse(), new MockFilterChain());

        assertThat(authorities()).contains("ROLE_STAFF").doesNotContain("employee.view");
        assertThat(current().getToken().getClaimAsStringList("permissions")).isEmpty();
        assertThat((Boolean) current().getToken().getClaim("permissionsStale")).isTrue();
    }

    @Test
    @DisplayName("RBAC-05: STAFF → MANAGER không đổi quyền (cùng nguồn People)")
    void staffAndManagerShareTheSameRecomputeResult() throws Exception {
        var effective = mock(EffectivePermissionsService.class);
        when(effective.activeMember("org-1", "gm-1")).thenReturn(true);
        when(effective.resolve("org-1", "gm-1")).thenReturn(
            new EffectivePermissionsService.EffectivePermissions(
                Set.of("employee.view"), Map.of("employee.view", Set.of("DEPARTMENT:dept-1")), Set.of()));

        authenticate(employeeToken("STAFF", List.of()), "ROLE_STAFF");
        new DelegatedAuthorityFilter(effective).doFilter(
            new MockHttpServletRequest(), new MockHttpServletResponse(), new MockFilterChain());
        Set<String> staff = authorities();

        authenticate(employeeToken("MANAGER", List.of()), "ROLE_MANAGER");
        new DelegatedAuthorityFilter(effective).doFilter(
            new MockHttpServletRequest(), new MockHttpServletResponse(), new MockFilterChain());
        Set<String> manager = authorities();

        assertThat(staff).contains("employee.view");
        assertThat(manager).contains("employee.view");
    }

    @Test
    @DisplayName("RBAC-05: OWNER giữ token, không bị tính lại theo People")
    void ownerTokenIsNotRecomputed() throws Exception {
        var effective = mock(EffectivePermissionsService.class);
        when(effective.activeDelegationGrants("org-1", "gm-1")).thenReturn(Map.of());
        authenticate(employeeToken("OWNER", List.of("employee.view")),
            "ROLE_OWNER", "employee.view");

        new DelegatedAuthorityFilter(effective).doFilter(
            new MockHttpServletRequest(), new MockHttpServletResponse(), new MockFilterChain());

        assertThat(authorities()).contains("ROLE_OWNER", "employee.view");
        org.mockito.Mockito.verify(effective, org.mockito.Mockito.never())
            .resolve(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
    }
}
