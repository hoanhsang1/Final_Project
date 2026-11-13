package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record ClassCancelRequest(
    @NotBlank(message = "REASON_REQUIRED")
    @Size(max = 1000, message = "REASON_TOO_LONG") String reason,
    @NotNull(message = "VERSION_REQUIRED")
    @PositiveOrZero(message = "VERSION_INVALID") Long version
) {}
