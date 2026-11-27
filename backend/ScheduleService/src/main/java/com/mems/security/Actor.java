package com.mems.security;
import com.mems.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Component
public class Actor {
    public Jwt jwt() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof Jwt jwt)) throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Bearer token required");
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
    public void requireDepartment(String id) {
        orgId();
        if (!owner() && !Objects.equals(id, jwt().getClaimAsString("departmentId")))
            throw forbidden("Department access denied");
    }
    /** Yêu cầu một trong các alias quyền (schedule.create / SCHEDULE_CREATE) trong phòng ban. */
    public void requireAnyPermissionIn(Set<String> aliases, String departmentId) {
        requireDepartment(departmentId);
        if (owner()) return;
        List<String> permissions = jwt().getClaimAsStringList("permissions");
        if (permissions == null || permissions.stream().noneMatch(aliases::contains))
            throw forbidden("Required permission is missing in this department");
    }
    public ApiException forbidden(String message) {
        return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", message);
    }
}
