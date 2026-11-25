package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TeacherStatusRequest(
    @NotBlank @Size(max = 30) String status
) {}
