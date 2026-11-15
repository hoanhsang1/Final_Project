package com.mems.dto;

import java.time.Instant;
import java.util.List;
import java.util.Set;

/**
 * Chi tiết nhân sự. Email/điện thoại là trường nhạy cảm: service trả null khi
 * người xem không có {@code employee.view_detail} trong phòng ban tương ứng.
 */
public record MemberDetailResponse(
    String userId,
    String username,
    String departmentId,
    String departmentName,
    String role,
    String status,
    Instant appointedAt,
    String appointedBy,
    String staffCode,
    String fullName,
    String email,
    String phone,
    boolean teacher,
    String contractType,
    String teachingStatus,
    Set<String> positionIds,
    Set<String> permissions,
    long classCount,
    boolean noClass,
    String classLabel,
    List<AssignmentHistoryResponse> assignmentHistory
) {}
