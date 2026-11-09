package com.mems.dto;

import jakarta.validation.constraints.Size;

public record ClassReopenRequest(
    @Size(max = 1000) String reason
) {}
