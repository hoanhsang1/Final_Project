package com.mems.dto;

import java.time.Instant;
import java.time.LocalDate;

public record SchoolClassResponse(
    String id,
    String orgId,
    String classCode,
    String name,
    String academicYear,
    LocalDate startDate,
    LocalDate endDate,
    String status,
    ClassTeacherInfo teacher,
    String closeState,
    long version,
    int studentCount,
    String createdBy,
    Instant createdAt,
    Instant updatedAt,
    String cancelReason,
    String closeRequestNote,
    String closeRejectReason
) {
    /** Giữ constructor cũ cho danh sách/ngữ cảnh không cần 3 lý do (chỉ chi tiết mới nạp). */
    public SchoolClassResponse(
        String id, String orgId, String classCode, String name, String academicYear,
        LocalDate startDate, LocalDate endDate, String status, ClassTeacherInfo teacher,
        String closeState, long version, int studentCount, String createdBy,
        Instant createdAt, Instant updatedAt
    ) {
        this(id, orgId, classCode, name, academicYear, startDate, endDate, status, teacher,
            closeState, version, studentCount, createdBy, createdAt, updatedAt, null, null, null);
    }
}
