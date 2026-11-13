package com.mems.dto;

import jakarta.validation.constraints.Size;

public record ClassReopenRequest(
    @Size(max = 1000, message = "REASON_TOO_LONG") String reason
) {}
