package com.mems.dto;

/** Mục không xếp được (hoặc cảnh báo) khi dựng yêu cầu xếp lịch, kèm lý do đọc được. */
public record UnschedulableRequirement(
    String classId,
    String className,
    String subjectId,
    String subjectName,
    String reasonCode,
    String reason
) {}
