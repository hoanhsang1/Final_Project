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
    Integer sessionsPerWeek,
    Integer stageNo,
    String categoryId,
    String roomRequirement,
    String teacherId,
    String teacherName,
    boolean isPrimary,
    String status
) {
    /** Tương thích với constructor cũ khi chưa có thông tin xếp lịch. */
    public ClassSubjectInfo(String classId, String subjectId, String subjectCode, String subjectName,
                            String source, String curriculumId, Integer requiredSessions,
                            Integer plannedSessions, Integer sessionMinutes, String teacherId,
                            String teacherName, boolean isPrimary, String status) {
        this(classId, subjectId, subjectCode, subjectName, source, curriculumId, requiredSessions,
            plannedSessions, sessionMinutes, null, null, null, null, teacherId, teacherName,
            isPrimary, status);
    }
}
