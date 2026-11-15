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
}
