package com.mems.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record StudentUpdateRequest(
    @NotBlank @Size(max = 200) String fullName,
    LocalDate dateOfBirth,
    @Email @Size(max = 255) String email,
    @Size(max = 50) String phone,
    @Pattern(regexp = "active|inactive|suspended") String status
) {}

