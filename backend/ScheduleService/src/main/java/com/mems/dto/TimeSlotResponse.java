package com.mems.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalTime;

public record TimeSlotResponse(
    String id,
    int periodNo,
    String name,
    @JsonFormat(pattern = "HH:mm") LocalTime startTime,
    @JsonFormat(pattern = "HH:mm") LocalTime endTime,
    boolean joinsNext,
    boolean isActive
) {
}
