package com.mems.dto;

import java.time.Instant;

public record CurriculumResponse(
    String id,
    String orgId,
    String code,
    String name,
    String description,
    String gradeLevel,
    String majorCode,
    boolean isActive,
    int version,
    int subjectCount,
    Instant createdAt,
    Instant updatedAt
) {}
