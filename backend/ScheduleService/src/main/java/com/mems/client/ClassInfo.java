package com.mems.client;

import java.time.LocalDate;

/** Thông tin lớp từ PeopleService {@code /internal/classes/{id}}. */
public record ClassInfo(String id, String orgId, String classCode, String name,
                        String status, String closeState, String teacherId, String teacherName,
                        LocalDate startDate, LocalDate endDate, String subjectId, String subjectName,
                        int studentCount) {}
