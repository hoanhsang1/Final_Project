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
    Integer sessionsPerWeek,   // D8: số buổi mỗi tuần (NULL = chưa đặt, dùng mặc định 2)
    Integer stageNo,           // D9: giai đoạn (mặc định 1)
    String categoryId,         // danh mục môn học (từ subject)
    String roomRequirement,    // ANY | COMPUTER (từ subject)
    String teacherId,
    String teacherName,
    boolean isPrimary,
    String status          // PLANNED, IN_PROGRESS, COMPLETED, CANCELLED
) {}
