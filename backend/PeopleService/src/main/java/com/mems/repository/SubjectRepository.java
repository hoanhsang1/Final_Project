package com.mems.repository;

import com.mems.dto.SubjectResponse;
import com.mems.dto.SubjectUsageResponse;
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
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class SubjectRepository {
    private static final String SELECT_COLUMNS = "SELECT s.id, s.code, s.name, s.description, "
        + "s.is_active, s.created_at, s.updated_at, s.category_id, c.name AS category_name, "
        + "s.room_requirement FROM subject s "
        + "LEFT JOIN subject_category c ON c.id=s.category_id AND c.org_id=s.org_id ";

    private final JdbcTemplate jdbc;

    public SubjectRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record SubjectRow(String id, String name) {}

    public List<SubjectResponse> list(String orgId, String q, boolean includeInactive) {
        String term = TextNormalizer.likeContains(q);
        StringBuilder sql = new StringBuilder(SELECT_COLUMNS).append("WHERE s.org_id=? ");
        if (!includeInactive) sql.append("AND s.is_active=TRUE ");
        if (term != null) sql.append("AND (s.name_unaccented LIKE ? ESCAPE '!' OR s.code LIKE ? ESCAPE '!') ");
        sql.append("ORDER BY s.is_active DESC, s.name");
        Object[] params = term == null ? new Object[]{orgId} : new Object[]{orgId, term, term};
        return jdbc.query(sql.toString(), (rs, n) -> map(rs), params);
    }

    public List<SubjectResponse> listActive(String orgId, String q) {
        return list(orgId, q, false);
    }

    public SubjectResponse require(String id, String orgId) {
        List<SubjectResponse> rows = jdbc.query(SELECT_COLUMNS + "WHERE s.id=? AND s.org_id=?",
            (rs, n) -> map(rs), id, orgId);
        if (rows.isEmpty()) throw new AppException(ErrorCode.SUBJECT_NOT_FOUND);
        return rows.get(0);
    }

    public SubjectRow requireActive(String id, String orgId) {
        List<SubjectRow> rows = jdbc.query(
            "SELECT id, name FROM subject WHERE id=? AND org_id=? AND is_active=TRUE",
            (rs, n) -> new SubjectRow(rs.getString("id"), rs.getString("name")), id, orgId);
        if (rows.isEmpty()) throw new AppException(ErrorCode.SUBJECT_NOT_FOUND);
        return rows.get(0);
    }

    public SubjectRow nullableActive(String id, String orgId) {
        if (id == null || id.isBlank()) return null;
        return requireActive(id.trim(), orgId);
    }

    /** Tên category đang hoạt động trong tổ chức; null nếu không tồn tại/đã ngừng. */
    public String activeCategoryName(String orgId, String categoryId) {
        List<String> names = jdbc.queryForList(
            "SELECT name FROM subject_category WHERE id=? AND org_id=? AND is_active=TRUE",
            String.class, categoryId, orgId);
        return names.isEmpty() ? null : names.get(0);
    }

    public SubjectResponse create(String orgId, String code, String name, String description,
                                  String createdBy) {
        return create(orgId, code, name, description, null, "ANY", createdBy);
    }

    public SubjectResponse create(String orgId, String code, String name, String description,
                                  String categoryId, String roomRequirement, String createdBy) {
        String id = UUID.randomUUID().toString();
        Instant now = Instant.now();
        try {
            jdbc.update("""
                INSERT INTO subject(id, org_id, code, name, name_unaccented, description, category_id,
                                    room_requirement, is_active, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?)
                """, id, orgId, trimToNull(code), name.trim(), TextNormalizer.unaccent(name),
                trimToNull(description), categoryId, roomRequirement, createdBy, Timestamp.from(now));
        } catch (DuplicateKeyException duplicate) {
            throw duplicateSubject(duplicate);
        }
        return require(id, orgId);
    }

    public SubjectResponse update(String id, String orgId, String code, String name,
                                  String description, String updatedBy) {
        return update(id, orgId, code, name, description, null, "ANY", updatedBy);
    }

    public SubjectResponse update(String id, String orgId, String code, String name,
                                  String description, String categoryId, String roomRequirement,
                                  String updatedBy) {
        require(id, orgId);
        try {
            jdbc.update("""
                UPDATE subject SET code=?, name=?, name_unaccented=?, description=?, category_id=?,
                                  room_requirement=?, updated_by=?, updated_at=?
                WHERE id=? AND org_id=?
                """, trimToNull(code), name.trim(), TextNormalizer.unaccent(name),
                trimToNull(description), categoryId, roomRequirement, updatedBy,
                Timestamp.from(Instant.now()), id, orgId);
        } catch (DuplicateKeyException duplicate) {
            throw duplicateSubject(duplicate);
        }
        return require(id, orgId);
    }

    public SubjectResponse setActive(String id, String orgId, boolean active, String updatedBy) {
        require(id, orgId);
        jdbc.update("""
            UPDATE subject SET is_active=?, updated_by=?, updated_at=? WHERE id=? AND org_id=?
            """, active, updatedBy, Timestamp.from(Instant.now()), id, orgId);
        return require(id, orgId);
    }

    public Optional<SubjectResponse> findByCode(String orgId, String code) {
        if (code == null || code.isBlank()) return Optional.empty();
        List<SubjectResponse> rows = jdbc.query(
            SELECT_COLUMNS + "WHERE s.org_id=? AND s.code=?",
            (rs, n) -> map(rs), orgId, code.trim());
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    public SubjectUsageResponse getUsage(String id, String orgId) {
        require(id, orgId);
        List<SubjectUsageResponse.SubjectClassUsageItem> classes = jdbc.query("""
            SELECT id, class_code, name, status FROM school_class
            WHERE subject_id=? AND org_id=? AND deleted_at IS NULL
            ORDER BY name
            """, (rs, n) -> new SubjectUsageResponse.SubjectClassUsageItem(
                rs.getString("id"),
                rs.getString("class_code"),
                rs.getString("name"),
                rs.getString("status")
            ), id, orgId);

        // class_subject/curriculum_subject không có org_id trên schema thật; lọc org qua bảng cha.
        List<SubjectUsageResponse.SubjectClassUsageItem> classSubjects = jdbc.query("""
            SELECT c.id, c.class_code, c.name, cs.status
            FROM class_subject cs
            JOIN school_class c ON c.id=cs.class_id AND c.org_id=?
            WHERE cs.subject_id=? AND c.deleted_at IS NULL AND cs.status <> 'CANCELLED'
            ORDER BY c.name
            """, (rs, n) -> new SubjectUsageResponse.SubjectClassUsageItem(
                rs.getString("id"),
                rs.getString("class_code"),
                rs.getString("name"),
                rs.getString("status")
            ), orgId, id);

        List<SubjectUsageResponse.CurriculumUsageItem> curricula = jdbc.query("""
            SELECT cu.id, cu.code, cu.name
            FROM curriculum_subject cs
            JOIN curriculum cu ON cu.id=cs.curriculum_id AND cu.org_id=?
            WHERE cs.subject_id=?
            ORDER BY cu.name
            """, (rs, n) -> new SubjectUsageResponse.CurriculumUsageItem(
                rs.getString("id"),
                rs.getString("code"),
                rs.getString("name")
            ), orgId, id);

        return new SubjectUsageResponse(id, classes.size(), classes,
            classSubjects.size(), classSubjects, curricula.size(), curricula);
    }

    /** Số lớp đang tham chiếu môn học — dùng cho báo cáo trước khi ngừng hoạt động. */
    public int classUsage(String subjectId, String orgId) {
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM school_class WHERE subject_id=? AND org_id=? AND deleted_at IS NULL",
            Integer.class, subjectId, orgId);
        return count == null ? 0 : count;
    }

    private SubjectResponse map(ResultSet rs) throws SQLException {
        Timestamp updated = rs.getTimestamp("updated_at");
        return new SubjectResponse(rs.getString("id"), rs.getString("code"), rs.getString("name"),
            rs.getString("description"), rs.getBoolean("is_active"),
            rs.getTimestamp("created_at").toInstant(), updated == null ? null : updated.toInstant(),
            rs.getString("category_id"), rs.getString("category_name"),
            rs.getString("room_requirement"));
    }

    private AppException duplicateSubject(DuplicateKeyException cause) {
        String message = cause.getMostSpecificCause().getMessage();
        if (message != null && message.toLowerCase().contains("uq_subject_org_code")) {
            return new AppException(ErrorCode.SUBJECT_CODE_EXISTS, "Mã môn học đã tồn tại trong tổ chức");
        }
        return new AppException(ErrorCode.CONFLICT, "Tên môn học đã tồn tại trong tổ chức");
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
