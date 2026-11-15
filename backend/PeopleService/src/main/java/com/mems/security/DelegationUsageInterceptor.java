package com.mems.security;

import com.mems.service.PeopleAuditService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Ghi audit khi một request thành công thực sự dùng quyền ủy quyền (quy tắc 7).
 *
 * <p>{@link DelegatedAuthorityFilter} đã đặt map quyền ủy quyền còn hiệu lực vào
 * request; interceptor đối chiếu với quyền mà handler yêu cầu
 * ({@code @RequirePermission} hoặc {@code @PreAuthorize}) để biết quyền nào đã
 * được dùng. Chỉ ghi khi response 2xx.</p>
 */
public class DelegationUsageInterceptor implements HandlerInterceptor {
    private static final Pattern QUOTED = Pattern.compile("'([^']+)'");

    private final PeopleAuditService audit;

    public DelegationUsageInterceptor(PeopleAuditService audit) {
        this.audit = audit;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        if (ex != null || response.getStatus() < 200 || response.getStatus() >= 300) return;
        if (!(handler instanceof HandlerMethod method)) return;
        if (!(request.getAttribute(DelegatedAuthorityFilter.GRANTS_ATTRIBUTE) instanceof Map<?, ?> rawGrants)) return;
        if (!(SecurityContextHolder.getContext().getAuthentication() instanceof JwtAuthenticationToken auth)) return;

        Map<String, String> grants = new TreeMap<>();
        rawGrants.forEach((key, value) -> {
            if (key != null && value != null) grants.put(key.toString(), value.toString());
        });
        if (grants.isEmpty()) return;

        Jwt jwt = auth.getToken();
        String orgId = jwt.getClaimAsString("orgId");
        String userId = jwt.getSubject();
        if (orgId == null || userId == null) return;

        for (String permission : requiredPermissions(method)) {
            String delegationId = grants.get(permission);
            if (delegationId == null) continue;
            Map<String, Object> details = new LinkedHashMap<>();
            details.put("permission", permission);
            details.put("delegationId", delegationId);
            details.put("method", request.getMethod());
            details.put("path", request.getRequestURI());
            details.put("handler", method.getBeanType().getSimpleName() + "." + method.getMethod().getName());
            safeRecord(orgId, userId, delegationId, details);
        }
    }

    private Set<String> requiredPermissions(HandlerMethod method) {
        Set<String> permissions = new TreeSet<>();
        RequirePermission annotation = method.getMethodAnnotation(RequirePermission.class);
        if (annotation == null) annotation = method.getBeanType().getAnnotation(RequirePermission.class);
        if (annotation != null) permissions.add(annotation.value());

        var preAuthorize = method.getMethodAnnotation(
            org.springframework.security.access.prepost.PreAuthorize.class);
        if (preAuthorize != null) {
            Matcher matcher = QUOTED.matcher(preAuthorize.value());
            while (matcher.find()) permissions.add(matcher.group(1));
        }
        return permissions;
    }

    private void safeRecord(String orgId, String userId, String delegationId, Map<String, Object> details) {
        try {
            audit.record(orgId, userId, "DELEGATION_PERMISSION_USED", delegationId, details);
        } catch (RuntimeException ignored) {
            // Audit không được làm hỏng request đã xử lý xong.
        }
    }
}
