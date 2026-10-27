package com.mems.dto;
import jakarta.validation.constraints.*;
import java.util.Set;
public record PositionRequest(@NotBlank @Size(max=200) String name,
    @Size(max=1000) String description,
    @NotNull @Size(max=50) Set<@NotBlank @Size(max=100) String> permissions) {}
