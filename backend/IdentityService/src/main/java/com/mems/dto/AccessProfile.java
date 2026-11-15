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
 */
public record AccessProfile(String role, String departmentId, Set<String> permissions,
                            Map<String, Set<String>> permissionScopes,
                            Set<String> delegatedPermissions) {
    public AccessProfile(String role, String departmentId, Set<String> permissions) {
        this(role, departmentId, permissions,
            permissions == null ? Map.of() : permissions.stream()
                .collect(Collectors.toMap(p -> p, p -> Set.of("ORGANIZATION"))),
            Set.of());
    }

    public AccessProfile(String role, String departmentId, Set<String> permissions,
                         Map<String, Set<String>> permissionScopes) {
        this(role, departmentId, permissions, permissionScopes, Set.of());
    }

    public AccessProfile {
        permissions = permissions == null ? Set.of() : permissions;
        permissionScopes = permissionScopes == null ? Map.of() : permissionScopes;
        delegatedPermissions = delegatedPermissions == null ? Set.of() : delegatedPermissions;
    }
}
