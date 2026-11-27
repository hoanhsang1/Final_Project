package com.mems.repository;

import com.mems.dto.CurriculumResponse;
import com.mems.dto.CurriculumSubjectResponse;
import com.mems.dto.PageResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.service.TextNormalizer;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Repository
public class CurriculumRepository {

    private final JdbcTemplate jdbc;

    public CurriculumRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public PageResponse<CurriculumResponse> list(String orgId, String q, Boolean isActive, int page, int size) {
        String term = TextNormalizer.likeContains(q);
        StringBuilder sql = new StringBuilder(
            "SELECT c.*, (SELECT COUNT(*) FROM curriculum_subject cs WHERE cs.curriculum_id=c.id) AS subject_count " +
            "FROM curriculum c WHERE c.org_id=? ");
        List<Object> params = new ArrayList<>();
        params.add(orgId);
        if (isActive != null) { sql.append("AND c.is_active=? "); params.add(isActive); }
        if (term != null) { sql.append("AND (c.name LIKE ? ESCAPE '!' OR c.code LIKE ? ESCAPE '!') "); params.add(term); params.add(term); }
        sql.append("ORDER BY c.is_active DESC, c.name ");

        // count
        String countSql = "SELECT COUNT(*) FROM curriculum c WHERE c.org_id=?" +
            (isActive != null ? " AND c.is_active=?" : "") +
            (term != null ? " AND (c.name LIKE ? ESCAPE '!' OR c.code LIKE ? ESCAPE '!')" : "");
        Integer total = jdbc.queryForObject(countSql, Integer.class, params.toArray());
        if (total == null) total = 0;

        sql.append("LIMIT ? OFFSET ?");
        params.add(size);
        params.add((page - 1) * size);

        List<CurriculumResponse> items = jdbc.query(sql.toString(), (rs, n) -> mapFull(rs), params.toArray());
        int pages = (int) Math.ceil((double) total / size);
        return new PageResponse<>(items, total, page, size, pages);
    }

    public CurriculumResponse require(String id, String orgId) {
        List<CurriculumResponse> rows = jdbc.query(
            "SELECT c.*, (SELECT COUNT(*) FROM curriculum_subject cs WHERE cs.curriculum_id=c.id) AS subject_count " +
            "FROM curriculum c WHERE c.id=? AND c.org_id=?",
            (rs, n) -> mapFull(rs), id, orgId);
        if (rows.isEmpty()) throw new AppException(ErrorCode.CURRICULUM_NOT_FOUND);
        return rows.get(0);
    }

    public CurriculumResponse create(String orgId, String code, String name, String description,
                                     String gradeLevel, String majorCode, String createdBy) {
        String id = UUID.randomUUID().toString();
        try {
            jdbc.update("""
                INSERT INTO curriculum(id, org_id, code, name, description, grade_level, major_code,
                                      is_active, version, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, 0, ?, ?)
                """, id, orgId, trimToNull(code), name.trim(), trimToNull(description),
                trimToNull(gradeLevel), trimToNull(majorCode), createdBy, Timestamp.from(Instant.now()));
        } catch (DuplicateKeyException e) {
            throw new AppException(ErrorCode.CURRICULUM_CODE_EXISTS);
        }
        return require(id, orgId);
    }

    public CurriculumResponse update(String id, String orgId, String code, String name, String description,
                                     String gradeLevel, String majorCode, int expectedVersion, String updatedBy) {
        CurriculumResponse current = require(id, orgId);
        if (current.version() != expectedVersion)
            throw new AppException(ErrorCode.VERSION_MISMATCH);
        try {
            jdbc.update("""
                UPDATE curriculum SET code=?, name=?, description=?, grade_level=?, major_code=?,
                                     version=version+1, updated_by=?, updated_at=?
                WHERE id=? AND org_id=?
                """, trimToNull(code), name.trim(), trimToNull(description),
                trimToNull(gradeLevel), trimToNull(majorCode), updatedBy, Timestamp.from(Instant.now()), id, orgId);
        } catch (DuplicateKeyException e) {
            throw new AppException(ErrorCode.CURRICULUM_CODE_EXISTS);
        }
        return require(id, orgId);
    }

    public CurriculumResponse setActive(String id, String orgId, boolean active, String updatedBy) {
        require(id, orgId);
        jdbc.update("UPDATE curriculum SET is_active=?, updated_by=?, updated_at=? WHERE id=? AND org_id=?",
            active, updatedBy, Timestamp.from(Instant.now()), id, orgId);
        return require(id, orgId);
    }

    // ---- Curriculum Subjects ----

    public List<CurriculumSubjectResponse> listSubjects(String curriculumId) {
        return jdbc.query("""
            SELECT cs.*, s.code AS subject_code, s.name AS subject_name
            FROM curriculum_subject cs JOIN subject s ON s.id=cs.subject_id
            WHERE cs.curriculum_id=? ORDER BY cs.sequence_no
            """, (rs, n) -> mapSubject(rs), curriculumId);
    }

    public CurriculumSubjectResponse addSubject(String curriculumId, String subjectId,
                                                int sequenceNo, int requiredSessions, int sessionMinutes,
                                                Integer sessionsPerWeek,
                                                Double theoryHours, Double practiceHours,
                                                boolean isRequired, String notes,
                                                List<String> prerequisiteSubjectIds) {
        // check duplicate
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM curriculum_subject WHERE curriculum_id=? AND subject_id=?",
            Integer.class, curriculumId, subjectId);
        if (count != null && count > 0) throw new AppException(ErrorCode.CURRICULUM_SUBJECT_EXISTS);

        jdbc.update("""
            INSERT INTO curriculum_subject(curriculum_id, subject_id, sequence_no, required_sessions,
                                          session_minutes, sessions_per_week, theory_hours,
                                          practice_hours, is_required, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, curriculumId, subjectId, sequenceNo, requiredSessions, sessionMinutes,
            sessionsPerWeek, theoryHours, practiceHours, isRequired, trimToNull(notes));

        // Insert prerequisites
        if (prerequisiteSubjectIds != null) {
            jdbc.update("DELETE FROM curriculum_subject_prerequisite WHERE curriculum_id=? AND subject_id=?",
                curriculumId, subjectId);
            for (String prereqId : prerequisiteSubjectIds) {
                jdbc.update("INSERT INTO curriculum_subject_prerequisite(curriculum_id, subject_id, prerequisite_subject_id) VALUES(?,?,?)",
                    curriculumId, subjectId, prereqId);
            }
        }

        // bump version
        jdbc.update("UPDATE curriculum SET version=version+1, updated_at=? WHERE id=?",
            Timestamp.from(Instant.now()), curriculumId);

        return getSubject(curriculumId, subjectId);
    }

    public CurriculumSubjectResponse updateSubject(String curriculumId, String subjectId,
                                                   int sequenceNo, int requiredSessions, int sessionMinutes,
                                                   Integer sessionsPerWeek,
                                                   Double theoryHours, Double practiceHours,
                                                   boolean isRequired, String notes,
                                                   List<String> prerequisiteSubjectIds) {
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM curriculum_subject WHERE curriculum_id=? AND subject_id=?",
            Integer.class, curriculumId, subjectId);
        if (count == null || count == 0) throw new AppException(ErrorCode.CURRICULUM_SUBJECT_NOT_FOUND);

        jdbc.update("""
            UPDATE curriculum_subject SET sequence_no=?, required_sessions=?, session_minutes=?,
                                          sessions_per_week=?, theory_hours=?, practice_hours=?,
                                          is_required=?, notes=?
            WHERE curriculum_id=? AND subject_id=?
            """, sequenceNo, requiredSessions, sessionMinutes, sessionsPerWeek, theoryHours,
            practiceHours, isRequired, trimToNull(notes), curriculumId, subjectId);

        if (prerequisiteSubjectIds != null) {
            jdbc.update("DELETE FROM curriculum_subject_prerequisite WHERE curriculum_id=? AND subject_id=?",
                curriculumId, subjectId);
            for (String prereqId : prerequisiteSubjectIds) {
                jdbc.update("INSERT INTO curriculum_subject_prerequisite(curriculum_id, subject_id, prerequisite_subject_id) VALUES(?,?,?)",
                    curriculumId, subjectId, prereqId);
            }
        }

        jdbc.update("UPDATE curriculum SET version=version+1, updated_at=? WHERE id=?",
            Timestamp.from(Instant.now()), curriculumId);

        return getSubject(curriculumId, subjectId);
    }

    public void removeSubject(String curriculumId, String subjectId) {
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM curriculum_subject WHERE curriculum_id=? AND subject_id=?",
            Integer.class, curriculumId, subjectId);
        if (count == null || count == 0) throw new AppException(ErrorCode.CURRICULUM_SUBJECT_NOT_FOUND);

        jdbc.update("DELETE FROM curriculum_subject_prerequisite WHERE curriculum_id=? AND subject_id=?",
            curriculumId, subjectId);
        jdbc.update("DELETE FROM curriculum_subject WHERE curriculum_id=? AND subject_id=?",
            curriculumId, subjectId);
        jdbc.update("UPDATE curriculum SET version=version+1, updated_at=? WHERE id=?",
            Timestamp.from(Instant.now()), curriculumId);
    }

    private CurriculumSubjectResponse getSubject(String curriculumId, String subjectId) {
        return jdbc.queryForObject("""
            SELECT cs.*, s.code AS subject_code, s.name AS subject_name
            FROM curriculum_subject cs JOIN subject s ON s.id=cs.subject_id
            WHERE cs.curriculum_id=? AND cs.subject_id=?
            """, (rs, n) -> mapSubject(rs), curriculumId, subjectId);
    }

    private CurriculumResponse mapFull(ResultSet rs) throws SQLException {
        Timestamp upd = rs.getTimestamp("updated_at");
        return new CurriculumResponse(
            rs.getString("id"), rs.getString("org_id"), rs.getString("code"), rs.getString("name"),
            rs.getString("description"), rs.getString("grade_level"), rs.getString("major_code"),
            rs.getBoolean("is_active"), rs.getInt("version"), rs.getInt("subject_count"),
            rs.getTimestamp("created_at").toInstant(), upd == null ? null : upd.toInstant());
    }

    private CurriculumSubjectResponse mapSubject(ResultSet rs) throws SQLException {
        // Load prereqs
        String currId = rs.getString("curriculum_id");
        String subId = rs.getString("subject_id");
        List<String> prereqIds = jdbc.queryForList(
            "SELECT prerequisite_subject_id FROM curriculum_subject_prerequisite WHERE curriculum_id=? AND subject_id=?",
            String.class, currId, subId);
        return new CurriculumSubjectResponse(
            currId, subId, rs.getString("subject_code"), rs.getString("subject_name"),
            rs.getInt("sequence_no"), rs.getInt("required_sessions"), rs.getInt("session_minutes"),
            getIntOrNull(rs, "sessions_per_week"),
            getDoubleOrNull(rs, "theory_hours"), getDoubleOrNull(rs, "practice_hours"),
            rs.getBoolean("is_required"), rs.getString("notes"), prereqIds);
    }

    /** Toàn bộ cạnh tiên quyết của chương trình: subjectId -> danh sách môn phải học trước. */
    public Map<String, List<String>> prerequisiteEdges(String curriculumId) {
        Map<String, List<String>> edges = new LinkedHashMap<>();
        jdbc.query("""
            SELECT subject_id, prerequisite_subject_id
            FROM curriculum_subject_prerequisite WHERE curriculum_id=?
            """, rs -> {
                edges.computeIfAbsent(rs.getString("subject_id"), k -> new ArrayList<>())
                    .add(rs.getString("prerequisite_subject_id"));
            }, curriculumId);
        return edges;
    }

    private Integer getIntOrNull(ResultSet rs, String col) throws SQLException {
        int v = rs.getInt(col);
        return rs.wasNull() ? null : v;
    }

    private Double getDoubleOrNull(ResultSet rs, String col) throws SQLException {
        double v = rs.getDouble(col);
        return rs.wasNull() ? null : v;
    }

    private String trimToNull(String v) {
        if (v == null) return null;
        String t = v.trim();
        return t.isEmpty() ? null : t;
    }
}
