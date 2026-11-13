package com.mems.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record StudentRequest(
    @NotBlank(message = "CODE_REQUIRED")
    @Size(max = 100, message = "CODE_TOO_LONG") String studentCode,
    @NotBlank(message = "NAME_REQUIRED")
    @Size(max = 200, message = "NAME_TOO_LONG") String fullName,
    LocalDate dateOfBirth,
    @Email(message = "EMAIL_INVALID")
    @Size(max = 255, message = "EMAIL_TOO_LONG") String email,
    @Size(max = 50, message = "PHONE_TOO_LONG") String phone,
    @Pattern(regexp = "active|inactive|suspended", message = "STATUS_INVALID") String status
) {}
