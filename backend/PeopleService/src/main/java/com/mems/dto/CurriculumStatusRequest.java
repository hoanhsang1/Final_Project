package com.mems.dto;

import jakarta.validation.constraints.NotNull;

public record CurriculumStatusRequest(@NotNull boolean active) {}
