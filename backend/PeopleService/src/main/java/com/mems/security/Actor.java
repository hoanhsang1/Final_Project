package com.mems.security;
import com.mems.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import java.util.Objects;

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
    public ApiException forbidden(String message) {
        return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", message);
    }
}
