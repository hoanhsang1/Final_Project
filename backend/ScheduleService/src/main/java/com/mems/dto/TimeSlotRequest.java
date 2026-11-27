package com.mems.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalTime;

public record TimeSlotRequest(
    @Min(1) int periodNo,
    @Size(max = 50) String name,
    @NotNull @JsonFormat(pattern = "HH:mm") LocalTime startTime,
    @NotNull @JsonFormat(pattern = "HH:mm") LocalTime endTime,
    Boolean joinsNext,
    Boolean isActive
) {
}
