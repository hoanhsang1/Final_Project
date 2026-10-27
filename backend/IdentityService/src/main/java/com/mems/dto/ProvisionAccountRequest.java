package com.mems.dto;
import jakarta.validation.constraints.*;
public record ProvisionAccountRequest(
    @NotBlank @Pattern(regexp="[a-fA-F0-9-]{36}") String userId,
    @NotBlank String orgId,
    @NotBlank @Size(max=100) String username,
    @NotBlank @Email @Size(max=255) String email,
    @NotBlank @Size(min=12,max=72) String temporaryPassword,
    @NotBlank @Pattern(regexp="MANAGER|STAFF") String role,
    @NotBlank String appointedBy) {}
