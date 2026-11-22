package com.mems.dto;

public record ClassSubjectResponse(
    String classId,
    String subjectId,
    String subjectCode,
    String subjectName,
    String source,         // CURRICULUM, MANUAL, LEGACY
    String curriculumId,
    Integer requiredSessions,
    Integer plannedSessions,
    Integer sessionMinutes,
    String teacherId,
    String teacherName,
    boolean isPrimary,
    String status          // PLANNED, IN_PROGRESS, COMPLETED, CANCELLED
) {}
