package com.mems.dto;

import java.time.Instant;

public record SubjectResponse(String id, String code, String name, String description,
                              boolean active, Instant createdAt, Instant updatedAt) {}
