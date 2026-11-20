package com.mems.dto;

/** Thông tin giáo viên đủ điều kiện dạy một môn, dùng bởi ScheduleService qua internal API. */
public record EligibleTeacherInfo(String userId, String fullName, String departmentId) {}
