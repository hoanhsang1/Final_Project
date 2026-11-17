package com.mems.dto;

import jakarta.validation.constraints.NotNull;

public record SubjectStatusRequest(@NotNull(message = "ACTIVE_REQUIRED") Boolean active) {}
