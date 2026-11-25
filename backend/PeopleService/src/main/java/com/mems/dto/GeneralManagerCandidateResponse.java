package com.mems.dto;

/** Nhân sự đang hoạt động — ứng viên để Owner bổ nhiệm Tổng quản lý. */
public record GeneralManagerCandidateResponse(
    String userId,
    String username,
    String fullName,
    String departmentId,
    String departmentName
) {}
