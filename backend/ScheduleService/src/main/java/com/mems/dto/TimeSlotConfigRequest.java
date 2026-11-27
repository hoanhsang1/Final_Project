package com.mems.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record TimeSlotConfigRequest(@NotEmpty List<@Valid TimeSlotRequest> slots) {
}
