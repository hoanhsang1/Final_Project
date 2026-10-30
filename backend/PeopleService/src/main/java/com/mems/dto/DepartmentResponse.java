package com.mems.dto;

import java.time.Instant;
import java.util.List;

public record DepartmentResponse(
    String id,
    String name,
    String description,
    Instant createdAt,
    List<String> modules
) {}
