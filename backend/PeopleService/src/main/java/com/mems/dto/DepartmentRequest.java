package com.mems.dto;

import jakarta.validation.constraints.*;
import java.util.List;

public record DepartmentRequest(
    @NotBlank @Size(max = 200) String name,
    @Size(max = 1000) String description,
    @NotNull @Size(max = 6) List<@NotBlank String> moduleCodes
) {}
