package com.mems.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record TeacherAvailabilityDto(
    @Min(1) @Max(7) int weekday,
    @Min(1) int fromPeriod,
    @Min(1) int toPeriod,
    @NotBlank String kind
) {
}
