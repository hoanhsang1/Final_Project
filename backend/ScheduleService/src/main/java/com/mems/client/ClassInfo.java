package com.mems.client;

import java.time.LocalDate;

/** Bản sao tối thiểu từ PeopleService `GET /internal/classes/{id}`. */
public record ClassInfo(String id, String orgId, String classCode, String name, String status,
                        String teacherId, String teacherName, LocalDate startDate, LocalDate endDate,
                        String subjectName, int studentCount) {}
