package com.mems.dto;
import java.time.Instant;
import java.util.Set;
public record PositionResponse(String id,String name,String description,Instant createdAt,Set<String> permissions) {}
