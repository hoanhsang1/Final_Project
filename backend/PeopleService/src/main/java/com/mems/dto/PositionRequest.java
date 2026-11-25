package com.mems.dto;
import jakarta.validation.constraints.*;
import java.util.Set;
public record PositionRequest(
    @NotBlank(message = "NAME_REQUIRED")
    @Size(max = 200, message = "NAME_TOO_LONG") String name,
    @Size(max = 1000, message = "DESCRIPTION_TOO_LONG") String description,
    @NotNull(message = "PERMISSIONS_REQUIRED")
    @Size(max = 50, message = "PERMISSIONS_TOO_MANY")
    Set<@NotBlank(message = "PERMISSION_CODE_REQUIRED")
        @Size(max = 100, message = "PERMISSION_CODE_TOO_LONG") String> permissions,
    Set<@NotBlank(message = "PERMISSION_CODE_REQUIRED")
        @Size(max = 100, message = "PERMISSION_CODE_TOO_LONG") String> bundleCodes,
    String scope,
    String departmentId) {
    public PositionRequest(String name, String description, Set<String> permissions) {
        this(name, description, permissions, Set.of(), "DEPARTMENT", null);
    }
    public PositionRequest {
        permissions = permissions == null ? Set.of() : permissions;
        bundleCodes = bundleCodes == null ? Set.of() : bundleCodes;
        scope = scope == null || scope.isBlank() ? "DEPARTMENT" : scope.trim().toUpperCase();
    }
}
