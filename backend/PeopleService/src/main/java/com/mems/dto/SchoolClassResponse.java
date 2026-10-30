package com.mems.dto;

import java.time.Instant;

public record SchoolClassResponse(
    String id,
    String orgId,
    String classCode,
    String name,
    String academicYear,
    String status,
    int studentCount,
    String createdBy,
    Instant createdAt,
    Instant updatedAt
) {}

