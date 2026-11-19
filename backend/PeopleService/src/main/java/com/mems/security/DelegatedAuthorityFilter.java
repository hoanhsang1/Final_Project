package com.mems.security;

import com.mems.service.EffectivePermissionsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.*;

/**
 * Đồng bộ quyền theo DB ở MỖI request cho tài khoản nhân viên (RBAC-05).
 *
 * <p>JWT chỉ là ảnh chụp lúc đăng nhập. Với MANAGER/STAFF, filter tính lại toàn
 * bộ quyền hiệu lực từ PeopleService (chức danh + bundle + module + ủy quyền),
 * nên thu hồi/cấp mới có hiệu lực ngay ở request kế tiếp. Không xác minh được
 * (People/Identity lỗi, membership không ACTIVE) ⇒ chỉ giữ {@code ROLE_*},
 * không quyền — fail-closed, không fallback về token.</p>
 *
 * <p>OWNER/ORG_OWNER/STUDENT/TEACHER giữ quyền trong token (Owner policy do
 * Identity, SELF do role_permission); riêng quyền ủy quyền vẫn được đọc lại từ
 * DB để thu hồi có hiệu lực ngay.</p>
 */
public class DelegatedAuthorityFilter extends OncePerRequestFilter {
    /** Map mã quyền → id lần ủy quyền, dùng cho audit ở interceptor. */
    public static final String GRANTS_ATTRIBUTE = DelegatedAuthorityFilter.class.getName() + ".grants";
    /** Tập quyền đến từ chức danh (không gồm phần độc quyền ủy quyền). */
    public static final String POSITION_PERMISSIONS_ATTRIBUTE =
        DelegatedAuthorityFilter.class.getName() + ".positionPermissions";

    private final EffectivePermissionsService effectivePermissions;

    public DelegatedAuthorityFilter(EffectivePermissionsService effectivePermissions) {
        this.effectivePermissions = effectivePermissions;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() instanceof JwtAuthenticationToken authentication) {
            Jwt jwt = authentication.getToken();
            String orgId = jwt.getClaimAsString("orgId");
            String userId = jwt.getSubject();
            if (orgId != null && userId != null) {
                String role = jwt.getClaimAsString("role");
                if ("MANAGER".equals(role) || "STAFF".equals(role)) {
                    replaceWithRecomputed(request, authentication, jwt, orgId, userId);
                } else {
                    replaceDelegations(request, authentication, jwt, orgId, userId);
                }
            }
        }
        chain.doFilter(request, response);
    }

    /** MANAGER/STAFF: quyền hiệu lực lấy từ DB, không tin token. */
    private void replaceWithRecomputed(HttpServletRequest request, JwtAuthenticationToken current,
                                       Jwt jwt, String orgId, String userId) {
        EffectivePermissionsService.EffectivePermissions resolved = null;
        try {
            if (effectivePermissions.activeMember(orgId, userId)) {
                resolved = effectivePermissions.resolve(orgId, userId);
            }
        } catch (RuntimeException ex) {
            resolved = null;
        }
        if (resolved == null) {
            apply(request, current, jwt, Set.of(), Map.of(), Set.of(), Set.of(), true);
            return;
        }
        Set<String> delegated = new TreeSet<>(resolved.delegatedPermissions());
        Set<String> positions = new TreeSet<>(resolved.permissions());
        positions.removeAll(delegated);
        apply(request, current, jwt, resolved.permissions(), resolved.scopes(), delegated,
            positions, false);
        // Chỉ quyền độc quyền ủy quyền mới phục vụ audit DEL-01.
        request.setAttribute(GRANTS_ATTRIBUTE,
            Collections.unmodifiableMap(new TreeMap<>(resolved.delegationSources())));
    }

    /** Các role còn lại: giữ token, chỉ nạp lại phần ủy quyền từ DB. */
    private void replaceDelegations(HttpServletRequest request, JwtAuthenticationToken current,
                                    Jwt jwt, String orgId, String userId) {
        Set<String> tokenPermissions = new TreeSet<>(nullSafe(jwt.getClaimAsStringList("permissions")));
        Set<String> tokenDelegated = new TreeSet<>(nullSafe(jwt.getClaimAsStringList("delegatedPermissions")));
        Map<String, String> grants = effectivePermissions.activeDelegationGrants(orgId, userId);

        Set<String> positions = new TreeSet<>(tokenPermissions);
        positions.removeAll(tokenDelegated);
        Set<String> effective = new TreeSet<>(positions);
        effective.addAll(grants.keySet());

        // Quyền vừa từ chức vụ vừa từ ủy quyền KHÔNG bị đánh dấu delegated (DEL-03).
        Map<String, String> delegationOnly = new TreeMap<>(grants);
        delegationOnly.keySet().removeAll(positions);

        apply(request, current, jwt, effective, mergeScopes(jwt, positions, grants),
            new TreeSet<>(delegationOnly.keySet()), positions, isStale(jwt));
        request.setAttribute(GRANTS_ATTRIBUTE, Collections.unmodifiableMap(delegationOnly));
    }

    private void apply(HttpServletRequest request, JwtAuthenticationToken current, Jwt jwt,
                       Set<String> permissions, Map<String, ? extends Collection<String>> scopes,
                       Set<String> delegated, Set<String> positionPermissions, boolean stale) {
        Set<GrantedAuthority> authorities = new HashSet<>();
        for (GrantedAuthority authority : current.getAuthorities()) {
            if (authority.getAuthority().startsWith("ROLE_")) authorities.add(authority);
        }
        permissions.forEach(code -> authorities.add(new SimpleGrantedAuthority(code)));

        Map<String, List<String>> permissionScopes = new TreeMap<>();
        scopes.forEach((code, tokens) -> permissionScopes.put(code,
            tokens == null ? List.of() : new ArrayList<>(new TreeSet<>(tokens))));

        Map<String, Object> claims = new LinkedHashMap<>(jwt.getClaims());
        claims.put("permissions", new ArrayList<>(new TreeSet<>(permissions)));
        claims.put("delegatedPermissions", new ArrayList<>(new TreeSet<>(delegated)));
        claims.put("permissionScopes", permissionScopes);
        claims.put("permissionsStale", stale);

        Jwt updated = Jwt.withTokenValue(jwt.getTokenValue())
            .headers(headers -> headers.putAll(jwt.getHeaders()))
            .claims(target -> {
                target.clear();
                target.putAll(claims);
            })
            .build();

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new JwtAuthenticationToken(updated, authorities, current.getName()));
        SecurityContextHolder.setContext(context);

        request.setAttribute(POSITION_PERMISSIONS_ATTRIBUTE,
            Collections.unmodifiableSet(new TreeSet<>(positionPermissions)));
    }

    /**
     * Sao chép {@code permissionScopes} của token, bỏ quyền ủy quyền đã mất và
     * thêm phạm vi ORGANIZATION cho quyền ủy quyền mới có hiệu lực.
     */
    private Map<String, Collection<String>> mergeScopes(Jwt jwt, Set<String> basePermissions,
                                                        Map<String, String> grants) {
        Map<String, Collection<String>> scopes = new TreeMap<>();
        Object raw = jwt.getClaim("permissionScopes");
        if (raw instanceof Map<?, ?> map) {
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (!(entry.getKey() instanceof String code)) continue;
                Collection<String> tokens = new TreeSet<>();
                if (entry.getValue() instanceof Collection<?> values) {
                    for (Object value : values) {
                        if (value != null) tokens.add(value.toString());
                    }
                }
                scopes.put(code, tokens);
            }
        }

        Set<String> tokenDelegated = new TreeSet<>(nullSafe(jwt.getClaimAsStringList("delegatedPermissions")));
        for (String code : tokenDelegated) {
            if (!basePermissions.contains(code) && !grants.containsKey(code)) scopes.remove(code);
        }
        for (String code : grants.keySet()) {
            Collection<String> tokens = scopes.computeIfAbsent(code, key -> new TreeSet<>());
            tokens.add("ORGANIZATION");
        }
        return scopes;
    }

    private boolean isStale(Jwt jwt) {
        Object claim = jwt.getClaim("permissionsStale");
        return Boolean.TRUE.equals(claim);
    }

    private Collection<String> nullSafe(List<String> values) {
        return values == null ? List.of() : values;
    }
}
