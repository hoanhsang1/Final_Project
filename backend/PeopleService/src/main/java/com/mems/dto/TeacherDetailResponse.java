package com.mems.dto;

import java.time.Instant;
import java.util.List;
import java.util.Set;

public record TeacherDetailResponse(
    String userId,
    String staffCode,
    String fullName,
    String email,
    String phone,
    String departmentId,
    Set<String> positionIds,
    List<SpecialtyResponse> specialties,
    String contractType,
    String teachingStatus,
    List<TeacherClassResponse> classes,
    long version,
    Instant createdAt,
    Instant updatedAt,
    List<TeacherHistoryResponse> history
) {}
