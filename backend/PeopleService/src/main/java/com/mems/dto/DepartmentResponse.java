package com.mems.dto;
import java.time.Instant;
public record DepartmentResponse(String id, String name, String description, Instant createdAt) {}
