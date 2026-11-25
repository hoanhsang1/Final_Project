package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.Set;

/** Tạo một lần ủy quyền (quy tắc 3, 7). Chỉ Owner gọi được. */
public record DelegationCreateRequest(
    @NotBlank(message = "USER_ID_REQUIRED")
    String delegateId,
    @NotNull(message = "PERMISSIONS_REQUIRED")
    @Size(min = 1, max = 50, message = "PERMISSIONS_REQUIRED")
    Set<@NotBlank(message = "PERMISSION_CODE_REQUIRED")
        @Size(max = 100, message = "PERMISSION_CODE_TOO_LONG") String> permissions,
    /** Bỏ trống = hiệu lực ngay. */
    Instant effectiveFrom,
    /** Bỏ trống = không đặt hạn. */
    Instant effectiveTo,
    @Size(max = 1000, message = "REASON_TOO_LONG")
    String reason,
    /** Mặc định ORGANIZATION; Phần 6 chưa hỗ trợ phạm vi phòng ban. */
    String scope
) {
    public DelegationCreateRequest {
        permissions = permissions == null ? Set.of() : permissions;
        scope = scope == null || scope.isBlank() ? "ORGANIZATION" : scope.trim().toUpperCase();
    }
}
