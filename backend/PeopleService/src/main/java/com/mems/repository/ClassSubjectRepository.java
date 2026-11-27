package com.mems.repository;

import com.mems.dto.ClassSubjectListResponse;
import com.mems.dto.ClassSubjectResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

@Repository
public class ClassSubjectRepository {

    private final JdbcTemplate jdbc;

    public ClassSubjectRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public ClassSubjectListResponse list(String classId) {
        // Get curriculum_id from class
        List<String> curriculumIds = jdbc.queryForList(
            "SELECT curriculum_id FROM school_class WHERE id=?", String.class, classId);
        String curriculumId = curriculumIds.isEmpty() ? null : curriculumIds.get(0);

        List<ClassSubjectResponse> subjects = jdbc.query("""
            SELECT cs.*, s.code AS subject_code, s.name AS subject_name,
                   s.category_id AS category_id, s.room_requirement AS room_requirement,
                   CONCAT(sp.full_name, '') AS teacher_name
            FROM class_subject cs
            JOIN subject s ON s.id = cs.subject_id
            LEFT JOIN staff_profile sp ON sp.user_id = cs.teacher_id
            WHERE cs.class_id=?
            ORDER BY cs.is_primary DESC, cs.stage_no, cs.created_at
            """, (rs, n) -> mapSubject(rs), classId);

        return new ClassSubjectListResponse(classId, curriculumId, subjects);
    }

    public ClassSubjectResponse addSubject(String classId, String subjectId, int plannedSessions,
                                           int sessionMinutes, Integer sessionsPerWeek, int stageNo,
                                           String teacherId, String source, String curriculumId) {
        // Check duplicate
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM class_subject WHERE class_id=? AND subject_id=?",
            Integer.class, classId, subjectId);
        if (count != null && count > 0) throw new AppException(ErrorCode.CLASS_SUBJECT_EXISTS);

        // Check if this is first subject → mark as primary
        Integer existing = jdbc.queryForObject(
            "SELECT COUNT(*) FROM class_subject WHERE class_id=?", Integer.class, classId);
        boolean isPrimary = (existing == null || existing == 0);

        jdbc.update("""
            INSERT INTO class_subject(class_id, subject_id, source, curriculum_id, planned_sessions,
                                      session_minutes, sessions_per_week, stage_no, teacher_id,
                                      is_primary, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PLANNED', ?)
            """, classId, subjectId, source, curriculumId, plannedSessions,
            sessionMinutes, sessionsPerWeek, stageNo, teacherId, isPrimary,
            Timestamp.from(Instant.now()));

        // Nếu đây là môn học chính (primary), đồng bộ school_class.subject_id để ScheduleService có thể
        // xác định eligible teachers theo D-06 (teacher_subject.status='APPROVED').
        if (isPrimary) {
            jdbc.update("UPDATE school_class SET subject_id=? WHERE id=?", subjectId, classId);
        }

        return getSubject(classId, subjectId);
    }

    public ClassSubjectResponse updateSubject(String classId, String subjectId,
                                              Integer plannedSessions, Integer sessionMinutes,
                                              Integer sessionsPerWeek, Integer stageNo,
                                              String teacherId) {
        // ensure exists
        getSubject(classId, subjectId);
        jdbc.update("""
            UPDATE class_subject SET
                planned_sessions = COALESCE(?, planned_sessions),
                session_minutes = COALESCE(?, session_minutes),
                sessions_per_week = COALESCE(?, sessions_per_week),
                stage_no = COALESCE(?, stage_no),
                teacher_id = ?,
                updated_at = ?
            WHERE class_id=? AND subject_id=?
            """, plannedSessions, sessionMinutes, sessionsPerWeek, stageNo, teacherId,
            Timestamp.from(Instant.now()), classId, subjectId);
        return getSubject(classId, subjectId);
    }

    /**
     * Áp chương trình: chỉ THÊM môn còn thiếu (bỏ qua môn đã có), không xoá môn MANUAL.
     * Môn đầu tiên của lớp vẫn được đánh dấu chính và đồng bộ school_class.subject_id.
     * Trả về số dòng đã thêm.
     */
    public int applyCurriculum(String classId, String curriculumId,
                               List<com.mems.dto.CurriculumSubjectResponse> curriculumSubjects) {
        Integer existing = jdbc.queryForObject(
            "SELECT COUNT(*) FROM class_subject WHERE class_id=?", Integer.class, classId);
        boolean primaryAssigned = existing != null && existing > 0;
        Timestamp now = Timestamp.from(Instant.now());
        int inserted = 0;
        for (com.mems.dto.CurriculumSubjectResponse cs : curriculumSubjects) {
            Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM class_subject WHERE class_id=? AND subject_id=?",
                Integer.class, classId, cs.subjectId());
            if (count != null && count > 0) continue;

            boolean isPrimary = !primaryAssigned;
            int sessionsPerWeek = cs.sessionsPerWeek() != null ? cs.sessionsPerWeek() : 2;
            jdbc.update("""
                INSERT INTO class_subject(class_id, subject_id, source, curriculum_id,
                                          required_sessions, planned_sessions, session_minutes,
                                          sessions_per_week, stage_no, teacher_id, is_primary,
                                          status, created_at)
                VALUES (?, ?, 'CURRICULUM', ?, ?, ?, ?, ?, ?, NULL, ?, 'PLANNED', ?)
                """, classId, cs.subjectId(), curriculumId, cs.requiredSessions(),
                cs.requiredSessions(), cs.sessionMinutes(), sessionsPerWeek, cs.sequenceNo(),
                isPrimary, now);
            if (isPrimary) {
                primaryAssigned = true;
                jdbc.update("UPDATE school_class SET subject_id=? WHERE id=?",
                    cs.subjectId(), classId);
            }
            inserted++;
        }
        return inserted;
    }

    public void removeSubject(String classId, String subjectId) {
        // Check exists
        ClassSubjectResponse cs = getSubject(classId, subjectId);
        if (cs.isPrimary()) throw new AppException(ErrorCode.CLASS_SUBJECT_PRIMARY_DELETE);
        jdbc.update("DELETE FROM class_subject WHERE class_id=? AND subject_id=?", classId, subjectId);
    }

    public ClassSubjectResponse getSubject(String classId, String subjectId) {
        List<ClassSubjectResponse> rows = jdbc.query("""
            SELECT cs.*, s.code AS subject_code, s.name AS subject_name,
                   s.category_id AS category_id, s.room_requirement AS room_requirement,
                   sp.full_name AS teacher_name
            FROM class_subject cs
            JOIN subject s ON s.id = cs.subject_id
            LEFT JOIN staff_profile sp ON sp.user_id = cs.teacher_id
            WHERE cs.class_id=? AND cs.subject_id=?
            """, (rs, n) -> mapSubject(rs), classId, subjectId);
        if (rows.isEmpty()) throw new AppException(ErrorCode.CLASS_SUBJECT_NOT_FOUND);
        return rows.get(0);
    }

    private ClassSubjectResponse mapSubject(ResultSet rs) throws SQLException {
        return new ClassSubjectResponse(
            rs.getString("class_id"), rs.getString("subject_id"),
            rs.getString("subject_code"), rs.getString("subject_name"),
            rs.getString("source"), rs.getString("curriculum_id"),
            getIntOrNull(rs, "required_sessions"), getIntOrNull(rs, "planned_sessions"),
            getIntOrNull(rs, "session_minutes"),
            getIntOrNull(rs, "sessions_per_week"), getIntOrNull(rs, "stage_no"),
            rs.getString("category_id"), rs.getString("room_requirement"),
            rs.getString("teacher_id"), rs.getString("teacher_name"),
            rs.getBoolean("is_primary"), rs.getString("status"));
    }

    private Integer getIntOrNull(ResultSet rs, String col) throws SQLException {
        int v = rs.getInt(col);
        return rs.wasNull() ? null : v;
    }
}
