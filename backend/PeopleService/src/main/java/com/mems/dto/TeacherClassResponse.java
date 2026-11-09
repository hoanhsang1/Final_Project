package com.mems.dto;

public record TeacherClassResponse(
    String id,
    String classCode,
    String name,
    String status,
    String closeState,
    String closeLabel
) {}
