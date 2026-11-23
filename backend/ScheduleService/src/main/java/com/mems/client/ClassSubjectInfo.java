package com.mems.client;

public record ClassSubjectInfo(
    String classId,
    String subjectId,
    String subjectCode,
    String subjectName,
    String source,
    String curriculumId,
    Integer requiredSessions,
    Integer plannedSessions,
    Integer sessionMinutes,
    String teacherId,
    String teacherName,
    boolean isPrimary,
    String status
) {}
