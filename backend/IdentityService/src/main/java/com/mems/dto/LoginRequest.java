package com.mems.dto;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
    @NotBlank(message = "USERNAME_REQUIRED")
    String username,

    @NotBlank(message = "PASSWORD_REQUIRED")
    String password
) {}
