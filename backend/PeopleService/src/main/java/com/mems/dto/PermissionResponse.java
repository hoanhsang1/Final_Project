package com.mems.dto;

import java.util.Set;

public record PermissionResponse(String code, String description, String moduleCode,
                                 Set<String> allowedScopes) {
    public PermissionResponse(String code, String description, String moduleCode) {
        this(code, description, moduleCode, Set.of("ORGANIZATION", "DEPARTMENT"));
    }

    public PermissionResponse {
        allowedScopes = allowedScopes == null || allowedScopes.isEmpty()
            ? Set.of("ORGANIZATION", "DEPARTMENT") : allowedScopes;
    }
}
