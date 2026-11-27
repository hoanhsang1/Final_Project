package com.mems.client;

/** Giáo viên đủ điều kiện dạy một môn, từ PeopleService (D1). */
public record EligibleTeacherInfo(String userId, String fullName, String departmentId) {}
