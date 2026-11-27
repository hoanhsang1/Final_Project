package com.mems.client;

/**
 * Môn của lớp từ PeopleService {@code /internal/classes/{id}/subjects}.
 * {@code stageNo}/{@code sessionsPerWeek} có thể chưa có trong JSON cũ → mặc định 1/2 (D8, D9).
 */
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
    String status,
    Integer stageNo,
    Integer sessionsPerWeek
) {
    public ClassSubjectInfo {
        if (stageNo == null || stageNo < 1) stageNo = 1;
        if (sessionsPerWeek == null || sessionsPerWeek < 1) sessionsPerWeek = 2;
    }

    /** Dùng khi lớp chưa có class_subject, chỉ có môn chính trên school_class. */
    public ClassSubjectInfo(String classId, String subjectId, String subjectName, Integer sessionMinutes,
                            String teacherId, String teacherName, Integer stageNo, Integer sessionsPerWeek) {
        this(classId, subjectId, null, subjectName, "LEGACY", null, null, null, sessionMinutes,
            teacherId, teacherName, true, "PLANNED", stageNo, sessionsPerWeek);
    }
}
