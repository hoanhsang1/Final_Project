package com.mems.dto;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Hồ sơ truy cập hiệu lực.
 *
 * <p>{@code permissionScopes}: mã quyền → tập phạm vi. Phạm vi là
 * {@code ORGANIZATION} hoặc {@code DEPARTMENT:<departmentId>}.</p>
 *
 * <p>{@code delegatedPermissions}: tập con quyền đến từ ủy quyền (nguồn
 * {@code DELEGATED}); JWT giữ lại để PeopleService biết quyền nào phải kiểm
 * tra lại từ DB ở mỗi request và để audit nguồn.</p>
 *
 * <p>{@code stale}: PeopleService không xác minh được quyền tại thời điểm cấp
 * token (dùng bản ghi last-known-good hoặc quyền rỗng). Không bao giờ có nghĩa
 * là "toàn quyền".</p>
 */
public record AccessProfile(String role, String departmentId, Set<String> permissions,
                            Map<String, Set<String>> permissionScopes,
                            Set<String> delegatedPermissions, Boolean stale) {
    public AccessProfile(String role, String departmentId, Set<String> permissions) {
        this(role, departmentId, permissions,
            permissions == null ? Map.of() : permissions.stream()
                .collect(Collectors.toMap(p -> p, p -> Set.of("ORGANIZATION"))),
            Set.of(), false);
    }

    public AccessProfile(String role, String departmentId, Set<String> permissions,
                         Map<String, Set<String>> permissionScopes) {
        this(role, departmentId, permissions, permissionScopes, Set.of(), false);
    }

    public AccessProfile(String role, String departmentId, Set<String> permissions,
                         Map<String, Set<String>> permissionScopes,
                         Set<String> delegatedPermissions) {
        this(role, departmentId, permissions, permissionScopes, delegatedPermissions, false);
    }

    public AccessProfile {
        permissions = permissions == null ? Set.of() : permissions;
        permissionScopes = permissionScopes == null ? Map.of() : permissionScopes;
        delegatedPermissions = delegatedPermissions == null ? Set.of() : delegatedPermissions;
        stale = stale != null && stale;
    }

    public boolean isStale() {
        return Boolean.TRUE.equals(stale);
    }

    public AccessProfile withStale(boolean value) {
        return new AccessProfile(role, departmentId, permissions, permissionScopes,
            delegatedPermissions, value);
    }
}
