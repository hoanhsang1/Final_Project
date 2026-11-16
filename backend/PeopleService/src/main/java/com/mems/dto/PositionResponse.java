package com.mems.dto;

import java.time.Instant;
import java.util.Set;

public record PositionResponse(String id, String name, String description, Instant createdAt,
                               Set<String> permissions, String profileType,
                               Set<String> bundleCodes, String scope, String departmentId) {
    public PositionResponse(String id, String name, String description, Instant createdAt,
                            Set<String> permissions, String profileType) {
        this(id, name, description, createdAt, permissions, profileType, Set.of(), "DEPARTMENT", null);
    }
    public PositionResponse {
        permissions = permissions == null ? Set.of() : permissions;
        bundleCodes = bundleCodes == null ? Set.of() : bundleCodes;
    }
}
