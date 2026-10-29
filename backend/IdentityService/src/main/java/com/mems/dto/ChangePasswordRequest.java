package com.mems.dto;
import jakarta.validation.constraints.*;
public record ChangePasswordRequest(@NotBlank String currentPassword,@NotBlank @Size(min=12,max=72) String newPassword) {}
