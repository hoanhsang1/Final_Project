package com.mems.dto;

import java.util.List;

public record TeacherAssignableItem(
    String userId,
    String staffCode,
    String fullName,
    List<SpecialtyResponse> specialties,
    long classCount,
    String teachingStatus
) {}
