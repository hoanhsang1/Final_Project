package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SpecialtyCreateRequest(
    @NotBlank(message = "NAME_REQUIRED")
    @Size(max = 200, message = "NAME_TOO_LONG") String name) {}
