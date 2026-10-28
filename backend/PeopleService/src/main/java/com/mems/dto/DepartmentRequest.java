package com.mems.dto;
import jakarta.validation.constraints.*;
public record DepartmentRequest(@NotBlank @Size(max=200) String name, @Size(max=1000) String description) {}
