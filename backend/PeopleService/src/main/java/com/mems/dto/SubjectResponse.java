package com.mems.dto;

import java.time.Instant;

public record SubjectResponse(String id, String code, String name, String description,
                              boolean active, Instant createdAt, Instant updatedAt,
                              String categoryId, String categoryName, String roomRequirement) {

    public SubjectResponse(String id, String code, String name, String description,
                           boolean active, Instant createdAt, Instant updatedAt) {
        this(id, code, name, description, active, createdAt, updatedAt, null, null, "ANY");
    }
}
