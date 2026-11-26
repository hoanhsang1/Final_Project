package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SubjectRequest(
    @Size(max = 50, message = "CODE_TOO_LONG") String code,
    @NotBlank(message = "NAME_REQUIRED") @Size(max = 200, message = "NAME_TOO_LONG") String name,
    @Size(max = 500, message = "DESCRIPTION_TOO_LONG") String description,
    @Size(max = 36, message = "ID_TOO_LONG") String categoryId,
    String roomRequirement,
    Boolean confirm) {

    public SubjectRequest(String code, String name, String description) {
        this(code, name, description, null, null, null);
    }
}
