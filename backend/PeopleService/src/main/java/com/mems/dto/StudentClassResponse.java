package com.mems.dto;

import java.time.LocalDate;

/** Lớp của chính học sinh đang đăng nhập (quyền SELF). */
public record StudentClassResponse(
    String id,
    String classCode,
    String name,
    String academicYear,
    LocalDate startDate,
    LocalDate endDate,
    String status,
    String closeState,
    String teacherName,
    String subjectName
) {}
