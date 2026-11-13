package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.Set;

public record TeacherProfileRequest(
    @NotNull @Size(min = 1, max = 20) Set<@NotBlank @Size(max = 36) String> specialtyIds,
    @Pattern(regexp = "CO_HUU|THINH_GIANG") String contractType
) {}
