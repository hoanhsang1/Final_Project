package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.Set;

/** Điều chỉnh tập quyền/hạn ủy quyền đang hiệu lực. */
public record DelegationUpdateRequest(
    @NotNull(message = "PERMISSIONS_REQUIRED")
    @Size(min = 1, max = 50, message = "PERMISSIONS_REQUIRED")
    Set<@NotBlank(message = "PERMISSION_CODE_REQUIRED")
        @Size(max = 100, message = "PERMISSION_CODE_TOO_LONG") String> permissions,
    Instant effectiveFrom,
    Instant effectiveTo,
    @Size(max = 1000, message = "REASON_TOO_LONG")
    String reason
) {
    public DelegationUpdateRequest {
        permissions = permissions == null ? Set.of() : permissions;
    }
}
