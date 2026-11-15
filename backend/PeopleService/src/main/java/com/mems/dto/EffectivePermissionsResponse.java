package com.mems.dto;

import java.util.Map;
import java.util.Set;

/** Quyền hiệu lực của một người, kèm phạm vi và nguồn ủy quyền. */
public record EffectivePermissionsResponse(String userId, String orgId, String departmentId,
                                           Set<String> permissions,
                                           Map<String, Set<String>> permissionScopes,
                                           Set<String> delegatedPermissions) {
    public EffectivePermissionsResponse(String userId, String orgId, String departmentId,
                                        Set<String> permissions,
                                        Map<String, Set<String>> permissionScopes) {
        this(userId, orgId, departmentId, permissions, permissionScopes, Set.of());
    }

    public EffectivePermissionsResponse {
        permissions = permissions == null ? Set.of() : permissions;
        permissionScopes = permissionScopes == null ? Map.of() : permissionScopes;
        delegatedPermissions = delegatedPermissions == null ? Set.of() : delegatedPermissions;
    }
}
