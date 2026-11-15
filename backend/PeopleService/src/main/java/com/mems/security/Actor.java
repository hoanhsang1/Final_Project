package com.mems.security;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class Actor {
    public Jwt jwt() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof Jwt jwt)) throw new AppException(ErrorCode.UNAUTHENTICATED);
        return jwt;
    }
    public String userId() { return jwt().getSubject(); }
    public String orgId() {
        String id = jwt().getClaimAsString("orgId");
        if (id == null || id.isBlank()) throw forbidden("An organization is required");
        return id;
    }
    public boolean owner() {
        return SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_OWNER"));
    }
    /** Toàn bộ authority trong JWT: `ROLE_*` và mã permission (vd `employee.view`). */
    public Set<String> authorities() {
        return SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
            .map(a -> a.getAuthority()).collect(java.util.stream.Collectors.toSet());
    }
    public String departmentIdOrNull() { return jwt().getClaimAsString("departmentId"); }

    /** Có mã quyền (không xét phạm vi). OWNER luôn đúng. */
    public boolean hasPermission(String code) {
        return owner() || authorities().contains(code);
    }

    /**
     * Có quyền trong phạm vi cụ thể. OWNER luôn đúng.
     * Token cũ chưa có claim `permissionScopes` → giữ hành vi cũ: chỉ trong phòng ban của mình.
     */
    public boolean hasPermissionIn(String code, String departmentId) {
        if (owner()) return true;
        if (!authorities().contains(code)) return false;
        Object raw = jwt().getClaim("permissionScopes");
        if (!(raw instanceof Map<?, ?> scopes)) {
            return departmentId != null && Objects.equals(departmentId, departmentIdOrNull());
        }
        Object tokensRaw = scopes.get(code);
        if (!(tokensRaw instanceof Collection<?> tokens)) return false;
        if (tokens.contains("ORGANIZATION")) return true;
        return departmentId != null && tokens.contains("DEPARTMENT:" + departmentId);
    }

    public void requirePermission(String code) {
        orgId();
        if (!hasPermission(code)) throw forbidden("Missing permission: " + code);
    }

    public void requirePermissionIn(String code, String departmentId) {
        orgId();
        if (!hasPermissionIn(code, departmentId)) throw forbidden("Missing permission in scope: " + code);
    }

    public void requireDepartment(String id) {
        orgId();
        if (!owner() && !Objects.equals(id, jwt().getClaimAsString("departmentId")))
            throw forbidden("Department access denied");
    }
    public AppException forbidden(String message) {
        return new AppException(ErrorCode.FORBIDDEN, message);
    }
}
