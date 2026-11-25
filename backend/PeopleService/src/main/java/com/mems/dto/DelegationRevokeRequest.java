package com.mems.dto;

import jakarta.validation.constraints.Size;

/** Thu hồi ủy quyền; lý do là tùy chọn nhưng được ghi audit. */
public record DelegationRevokeRequest(
    @Size(max = 1000, message = "REASON_TOO_LONG") String reason
) {}
