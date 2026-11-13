package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ClassCloseRejectRequest(
    @NotBlank @Size(max = 1000) String reason
) {}
