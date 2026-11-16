package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Owner bổ nhiệm một nhân sự vào chức danh cấp tổ chức "Tổng quản lý". */
public record GeneralManagerAppointRequest(
    @NotBlank(message = "USER_ID_REQUIRED")
    String userId,
    @Size(max = 1000, message = "REASON_TOO_LONG")
    String reason
) {}
