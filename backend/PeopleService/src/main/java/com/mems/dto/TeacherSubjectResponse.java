package com.mems.dto;

/** Môn giáo viên đủ điều kiện dạy; reason = CATEGORY (cùng danh mục) hoặc EXCEPTION (ngoại lệ). */
public record TeacherSubjectResponse(String subjectId, String subjectCode, String subjectName,
                                     String reason) {}
