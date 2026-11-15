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
 * Đồng bộ quyền ủy quyền theo DB ở MỖI request (quy tắc 3, 7).
 *
 * <p>JWT chỉ là ảnh chụp lúc đăng nhập. Filter này bỏ các quyền đến từ ủy quyền
 * trong token rồi cộng lại đúng những gì bảng {@code delegation} còn hiệu lực,
 * nên thu hồi/chỉnh sửa/hết hạn có tác dụng ngay ở lần kiểm tra kế tiếp mà
 * không phải chờ token hết hạn.</p>
 *
 * <p>Quyền đến từ chức vụ vẫn giữ nguyên như token (PeopleService không tự tính
 * lại toàn bộ để tránh gọi Identity mỗi request).</p>
 */
public class DelegatedAuthorityFilter extends OncePerRequestFilter {
    /** Map mã quyền → id lần ủy quyền, dùng cho audit ở interceptor. */
    public static final String GRANTS_ATTRIBUTE = DelegatedAuthorityFilter.class.getName() + ".grants";

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
                replaceAuthentication(request, authentication, jwt, orgId, userId);
            }
        }
        chain.doFilter(request, response);
    }

    private void replaceAuthentication(HttpServletRequest request, JwtAuthenticationToken current,
                                       Jwt jwt, String orgId, String userId) {
        Set<String> tokenPermissions = new TreeSet<>(nullSafe(jwt.getClaimAsStringList("permissions")));
        Set<String> tokenDelegated = new TreeSet<>(nullSafe(jwt.getClaimAsStringList("delegatedPermissions")));
        Map<String, String> grants = effectivePermissions.activeDelegationGrants(orgId, userId);

        Set<String> basePermissions = new TreeSet<>(tokenPermissions);
        basePermissions.removeAll(tokenDelegated);

        Set<String> effective = new TreeSet<>(basePermissions);
        effective.addAll(grants.keySet());

        Set<GrantedAuthority> authorities = new HashSet<>();
        for (GrantedAuthority authority : current.getAuthorities()) {
            if (authority.getAuthority().startsWith("ROLE_")) authorities.add(authority);
        }
        effective.forEach(code -> authorities.add(new SimpleGrantedAuthority(code)));

        Map<String, Object> claims = new LinkedHashMap<>(jwt.getClaims());
        claims.put("permissions", new ArrayList<>(effective));
        claims.put("delegatedPermissions", new ArrayList<>(grants.keySet()));
        claims.put("permissionScopes", mergeScopes(jwt, basePermissions, grants));

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

        request.setAttribute(GRANTS_ATTRIBUTE, Collections.unmodifiableMap(grants));
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

    private Collection<String> nullSafe(List<String> values) {
        return values == null ? List.of() : values;
    }
}
