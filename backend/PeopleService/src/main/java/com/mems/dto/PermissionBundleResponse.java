package com.mems.dto;

import java.util.Set;

public record PermissionBundleResponse(String code, String name, String description,
                                       Set<String> permissions, Set<String> allowedScopes) {
    public PermissionBundleResponse {
        permissions = permissions == null ? Set.of() : permissions;
        allowedScopes = allowedScopes == null ? Set.of() : allowedScopes;
    }
}
