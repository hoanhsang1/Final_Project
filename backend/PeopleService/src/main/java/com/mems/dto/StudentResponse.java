package com.mems.dto;

import java.time.Instant;
import java.time.LocalDate;

public record StudentResponse(
    String id,
    String orgId,
    String studentCode,
    String fullName,
    LocalDate dateOfBirth,
    String email,
    String phone,
    String status,
    String classId,
    String classCode,
    String className,
    String createdBy,
    Instant createdAt,
    Instant updatedAt
) {}

