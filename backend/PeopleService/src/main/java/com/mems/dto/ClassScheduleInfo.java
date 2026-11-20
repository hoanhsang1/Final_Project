package com.mems.dto;

import java.time.LocalDate;

/** Thông tin lớp tối thiểu cho ScheduleService (gọi nội bộ, không lộ dữ liệu nhạy cảm). */
public record ClassScheduleInfo(String id, String orgId, String classCode, String name,
                                String status, String closeState, String teacherId, String teacherName,
                                LocalDate startDate, LocalDate endDate, String subjectName,
                                int studentCount) {}
