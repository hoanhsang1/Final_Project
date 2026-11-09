package com.mems.dto;

import java.time.Instant;
import java.time.LocalDate;

public record SchoolClassResponse(
    String id,
    String orgId,
    String classCode,
    String name,
    String academicYear,
    LocalDate startDate,
    LocalDate endDate,
    String status,
    ClassTeacherInfo teacher,
    String closeState,
    long version,
    int studentCount,
    String createdBy,
    Instant createdAt,
    Instant updatedAt
) {}
