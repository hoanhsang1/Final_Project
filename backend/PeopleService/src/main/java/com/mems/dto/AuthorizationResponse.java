package com.mems.dto;
import java.util.Map;
import java.util.Set;
public record AuthorizationResponse(String role,String departmentId,Set<String> permissions,
                                    Map<String,Set<String>> permissionScopes,
                                    Set<String> delegatedPermissions) {
    public AuthorizationResponse(String role,String departmentId,Set<String> permissions) {
        this(role,departmentId,permissions,Map.of(),Set.of());
    }
    public AuthorizationResponse(String role,String departmentId,Set<String> permissions,
                                 Map<String,Set<String>> permissionScopes) {
        this(role,departmentId,permissions,permissionScopes,Set.of());
    }
    public AuthorizationResponse {
        permissions = permissions == null ? Set.of() : permissions;
        permissionScopes = permissionScopes == null ? Map.of() : permissionScopes;
        delegatedPermissions = delegatedPermissions == null ? Set.of() : delegatedPermissions;
    }
}
