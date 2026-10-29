package com.mems.dto;
import jakarta.validation.constraints.*;
import java.util.Set;
public record MemberPositionsRequest(@NotNull @Size(max=50) Set<@NotBlank String> positionIds) {}
