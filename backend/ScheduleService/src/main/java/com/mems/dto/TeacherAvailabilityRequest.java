package com.mems.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record TeacherAvailabilityRequest(@NotNull List<@Valid TeacherAvailabilityDto> entries) {
}
