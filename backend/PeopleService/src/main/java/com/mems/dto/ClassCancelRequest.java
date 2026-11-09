package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record ClassCancelRequest(
    @NotBlank @Size(max = 1000) String reason,
    @NotNull @PositiveOrZero Long version
) {}
