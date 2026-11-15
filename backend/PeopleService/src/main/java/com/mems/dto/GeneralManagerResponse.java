package com.mems.dto;

import java.time.Instant;

/** Nhân sự đang giữ chức danh "Tổng quản lý" (phạm vi ORGANIZATION). */
public record GeneralManagerResponse(
    String userId,
    String username,
    String fullName,
    String departmentId,
    String departmentName,
    Instant appointedAt
) {}
