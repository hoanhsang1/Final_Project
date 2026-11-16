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
    String closeRejectReason,
    boolean needsReassignment,
    String reassignmentReason,
    String subjectId,
    String subjectName,
    String cancelState,
    String cancelRequestReason
) {
    /** Giữ constructor cũ cho ngữ cảnh không cần lý do/chi tiết mở rộng. */
    public SchoolClassResponse(
        String id, String orgId, String classCode, String name, String academicYear,
        LocalDate startDate, LocalDate endDate, String status, ClassTeacherInfo teacher,
        String closeState, long version, int studentCount, String createdBy,
        Instant createdAt, Instant updatedAt
    ) {
        this(id, orgId, classCode, name, academicYear, startDate, endDate, status, teacher,
            closeState, version, studentCount, createdBy, createdAt, updatedAt, null, null, null,
            false, null, null, null, null, null);
    }

    public SchoolClassResponse(
        String id, String orgId, String classCode, String name, String academicYear,
        LocalDate startDate, LocalDate endDate, String status, ClassTeacherInfo teacher,
        String closeState, long version, int studentCount, String createdBy,
        Instant createdAt, Instant updatedAt, String cancelReason, String closeRequestNote,
        String closeRejectReason, boolean needsReassignment, String reassignmentReason
    ) {
        this(id, orgId, classCode, name, academicYear, startDate, endDate, status, teacher,
            closeState, version, studentCount, createdBy, createdAt, updatedAt, cancelReason,
            closeRequestNote, closeRejectReason, needsReassignment, reassignmentReason,
            null, null, null, null);
    }
}
