package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ClassCloseRejectRequest(
    @NotBlank(message = "REASON_REQUIRED")
    @Size(max = 1000, message = "REASON_TOO_LONG") String reason
) {}
