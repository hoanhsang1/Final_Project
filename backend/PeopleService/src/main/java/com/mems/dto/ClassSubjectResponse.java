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
    Integer stageNo,          // D9: curriculum_subject.sequence_no, mặc định 1
    Integer sessionsPerWeek,  // D8: suy từ planned_sessions/4, curriculum, mặc định 2
    String teacherId,
    String teacherName,
    boolean isPrimary,
    String status          // PLANNED, IN_PROGRESS, COMPLETED, CANCELLED
) {}
