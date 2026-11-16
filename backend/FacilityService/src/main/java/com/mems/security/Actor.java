package com.mems.security;

import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

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
    public String departmentId() { return jwt().getClaimAsString("departmentId"); }
    public String role() { return jwt().getClaimAsString("role"); }
    public boolean owner() {
        return SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_OWNER"));
    }
    public Set<String> authorities() {
        return SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
            .map(a -> a.getAuthority()).collect(Collectors.toSet());
    }
    public boolean hasPermission(String code) {
        return owner() || authorities().contains(code);
    }
    public boolean hasPermissionIn(String code, String departmentId) {
        if (owner()) return true;
        if (!authorities().contains(code)) return false;
        Object raw = jwt().getClaim("permissionScopes");
        if (!(raw instanceof Map<?, ?> scopes)) {
            return departmentId != null && Objects.equals(departmentId, jwt().getClaimAsString("departmentId"));
        }
        Object tokensRaw = scopes.get(code);
        if (!(tokensRaw instanceof Collection<?> tokens)) return false;
        if (tokens.contains("ORGANIZATION")) return true;
        return departmentId != null && tokens.contains("DEPARTMENT:" + departmentId);
    }
    /** Một trong các mã quyền (dùng cho giai đoạn chuyển tiếp mã cũ/mã mới). */
    public boolean hasAnyPermissionIn(Collection<String> codes, String departmentId) {
        if (owner()) return true;
        return codes.stream().anyMatch(code -> hasPermissionIn(code, departmentId));
    }
    public void requirePermissionIn(String code, String departmentId) {
        orgId();
        if (!hasPermissionIn(code, departmentId)) throw forbidden("Missing permission in scope: " + code);
    }
    public void requireAnyPermissionIn(Collection<String> codes, String departmentId) {
        orgId();
        if (!hasAnyPermissionIn(codes, departmentId)) {
            throw forbidden("Missing permission in scope: " + String.join("/", codes));
        }
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
