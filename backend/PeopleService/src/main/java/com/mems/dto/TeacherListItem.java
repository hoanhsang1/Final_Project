package com.mems.dto;

import java.util.List;

public record TeacherListItem(
    String userId,
    String staffCode,
    String fullName,
    String email,
    String phone,
    String departmentId,
    List<SpecialtyResponse> specialties,
    String contractType,
    String teachingStatus,
    long classCount,
    boolean noClass,
    String classLabel
) {}
