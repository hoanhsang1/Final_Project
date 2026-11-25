package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResignationCreateRequest(
    @NotBlank(message = "USER_ID_REQUIRED")
    @Size(max = 36, message = "ID_TOO_LONG") String userId,
    @NotBlank(message = "REASON_REQUIRED")
    @Size(max = 1000, message = "REASON_TOO_LONG") String reason
) {}
