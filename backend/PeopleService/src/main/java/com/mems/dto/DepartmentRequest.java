package com.mems.dto;

import jakarta.validation.constraints.*;
import java.util.List;

public record DepartmentRequest(
    @NotBlank(message = "NAME_REQUIRED")
    @Size(max = 200, message = "NAME_TOO_LONG") String name,
    @Size(max = 1000, message = "DESCRIPTION_TOO_LONG") String description,
    @NotNull(message = "MODULE_CODES_REQUIRED")
    @Size(max = 6, message = "MODULE_CODES_TOO_MANY")
    List<@NotBlank(message = "MODULE_CODE_REQUIRED") String> moduleCodes
) {}
