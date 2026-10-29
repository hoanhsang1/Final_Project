package com.mems.dto;
import java.time.Instant;
import java.util.Set;
public record MemberResponse(String userId,String departmentId,String role,String appointedBy,Instant appointedAt,
    Set<String> positionIds,Set<String> permissions) {}
