package com.mems.dto;

import java.time.Instant;

public record SubjectCategoryResponse(
    String id,
    String name,
    boolean active,
    int subjectCount,
    Instant createdAt,
    Instant updatedAt
) {}
