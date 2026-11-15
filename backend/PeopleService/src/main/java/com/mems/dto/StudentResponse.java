package com.mems.dto;

import java.time.Instant;
import java.time.LocalDate;

public record StudentResponse(
    String id,
    String orgId,
    String studentCode,
    String fullName,
    LocalDate dateOfBirth,
    String email,
    String phone,
    String status,
    String classId,
    String classCode,
    String className,
    String createdBy,
    Instant createdAt,
    Instant updatedAt,
    String accountUsername,
    Instant accountCreatedAt
) {
    /** Giữ constructor cũ cho các ngữ cảnh chưa cần thông tin tài khoản. */
    public StudentResponse(
        String id, String orgId, String studentCode, String fullName, LocalDate dateOfBirth,
        String email, String phone, String status, String classId, String classCode,
        String className, String createdBy, Instant createdAt, Instant updatedAt
    ) {
        this(id, orgId, studentCode, fullName, dateOfBirth, email, phone, status, classId,
            classCode, className, createdBy, createdAt, updatedAt, null, null);
    }
}
