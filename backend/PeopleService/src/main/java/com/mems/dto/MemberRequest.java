package com.mems.dto;
import jakarta.validation.constraints.*;
import java.util.Set;
public record MemberRequest(@NotBlank @Size(max=100) String username,
    @NotBlank @Email @Size(max=255) String email,
    @NotBlank @Pattern(regexp="MANAGER|STAFF") String role,
    @NotNull @Size(max=50) Set<@NotBlank String> positionIds) {}
