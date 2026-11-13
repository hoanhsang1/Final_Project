package com.mems.dto;

import jakarta.validation.constraints.NotBlank;

public record LogoutRequest(
        @NotBlank(message = "REFRESH_TOKEN_REQUIRED") String refreshToken
) {}
