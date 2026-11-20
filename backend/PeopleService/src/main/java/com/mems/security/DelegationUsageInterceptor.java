package com.mems.security;

import com.mems.service.PeopleAuditService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

import java.time.Instant;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Ghi audit khi một request thành công thực sự dùng quyền ủy quyền (quy tắc 7 / DEL-01).
 *
 * <p>{@link DelegatedAuthorityFilter} chỉ đặt các quyền <em>độc quyền ủy quyền</em>
 * vào request (quyền vừa có từ chức vụ vừa có từ ủy quyền bị loại). Interceptor
 * đối chiếu với quyền mà handler yêu cầu — qua {@code @RequirePermission},
 * {@code @PreAuthorize} hoặc {@link DelegatedAction} — và chỉ ghi khi response 2xx.</p>
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

        String handlerName = method.getBeanType().getSimpleName() + "." + method.getMethod().getName();
        for (Usage usage : usages(method, request)) {
            String delegationId = grants.get(usage.permission());
            if (delegationId == null) continue;
            Map<String, Object> details = new LinkedHashMap<>();
            details.put("permissionCode", usage.permission());
            details.put("delegationId", delegationId);
            details.put("source", "DELEGATED");
            details.put("action", request.getMethod() + " " + handlerName);
            details.put("resourceType", usage.resourceType());
            details.put("resourceId", usage.resourceId());
            details.put("organizationId", orgId);
            details.put("timestamp", Instant.now().toString());
            details.put("result", "SUCCESS");
            Map<String, Object> context = new LinkedHashMap<>();
            context.put("path", request.getRequestURI());
            String departmentId = jwt.getClaimAsString("departmentId");
            if (departmentId != null) context.put("departmentId", departmentId);
            details.put("context", context);
            safeRecord(orgId, userId, delegationId, details);
        }
    }

    private record Usage(String permission, String resourceType, String resourceId) {}

    private List<Usage> usages(HandlerMethod method, HttpServletRequest request) {
        Map<String, String> variables = pathVariables(request);
        List<Usage> usages = new ArrayList<>();
        for (String permission : requiredPermissions(method)) {
            usages.add(new Usage(permission, null, null));
        }
        DelegatedAction action = method.getMethodAnnotation(DelegatedAction.class);
        if (action != null) {
            String resourceId = action.resourceId().isBlank() ? null : variables.get(action.resourceId());
            usages.add(new Usage(action.permission(), action.resourceType(), resourceId));
        }
        return usages;
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> pathVariables(HttpServletRequest request) {
        Object raw = request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
        return raw instanceof Map<?, ?> map ? (Map<String, String>) map : Map.of();
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
