package com.mems.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

import java.util.Map;

/**
 * Thực thi {@link RequirePermission}. Actor không trạng thái nên khởi tạo trực
 * tiếp — tránh phụ thuộc bean trong các slice test.
 */
public class PermissionInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod method)) return true;
        RequirePermission annotation = method.getMethodAnnotation(RequirePermission.class);
        if (annotation == null) annotation = method.getBeanType().getAnnotation(RequirePermission.class);
        if (annotation == null) return true;

        Actor actor = new Actor();
        if (annotation.department().isBlank()) {
            actor.requirePermission(annotation.value());
        } else {
            @SuppressWarnings("unchecked")
            Map<String, String> variables = (Map<String, String>) request.getAttribute(
                HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
            String departmentId = variables == null ? null : variables.get(annotation.department());
            actor.requirePermissionIn(annotation.value(), departmentId);
        }
        return true;
    }
}
