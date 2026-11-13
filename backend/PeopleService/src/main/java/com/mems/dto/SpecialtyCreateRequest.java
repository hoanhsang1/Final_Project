package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SpecialtyCreateRequest(@NotBlank @Size(max = 200) String name) {}
