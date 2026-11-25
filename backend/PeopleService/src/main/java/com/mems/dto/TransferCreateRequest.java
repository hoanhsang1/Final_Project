package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Khởi tạo yêu cầu chuyển phòng ban (quy tắc 15). */
public record TransferCreateRequest(
    @NotBlank(message = "USER_ID_REQUIRED")
    String userId,
    @NotBlank(message = "DEPARTMENT_REQUIRED")
    String toDepartmentId,
    @NotBlank(message = "REASON_REQUIRED")
    @Size(max = 1000, message = "REASON_TOO_LONG")
    String reason
) {}
