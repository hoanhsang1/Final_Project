package com.mems.client;

/** Giáo viên đủ điều kiện dạy một môn, lấy từ PeopleService internal API. */
public record EligibleTeacherInfo(String userId, String fullName, String departmentId) {}
