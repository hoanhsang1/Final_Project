package com.mems.repository;

import com.mems.dto.SubjectCategoryResponse;
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
import java.util.UUID;

@Repository
public class SubjectCategoryRepository {
    private static final String SELECT_COLUMNS = """
        SELECT c.id, c.name, c.is_active, c.created_at, c.updated_at,
               (SELECT COUNT(*) FROM subject s
                 WHERE s.category_id=c.id AND s.org_id=c.org_id) AS subject_count
        FROM subject_category c
        """;

    private final JdbcTemplate jdbc;

    public SubjectCategoryRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<SubjectCategoryResponse> list(String orgId, boolean includeInactive) {
        StringBuilder sql = new StringBuilder(SELECT_COLUMNS).append("WHERE c.org_id=? ");
        if (!includeInactive) sql.append("AND c.is_active=TRUE ");
        sql.append("ORDER BY c.is_active DESC, c.name");
        return jdbc.query(sql.toString(), (rs, n) -> map(rs), orgId);
    }

    public SubjectCategoryResponse require(String id, String orgId) {
        List<SubjectCategoryResponse> rows = jdbc.query(
            SELECT_COLUMNS + "WHERE c.id=? AND c.org_id=?", (rs, n) -> map(rs), id, orgId);
        if (rows.isEmpty()) throw new AppException(ErrorCode.SUBJECT_CATEGORY_NOT_FOUND);
        return rows.get(0);
    }

    public SubjectCategoryResponse create(String orgId, String name, String createdBy) {
        String id = UUID.randomUUID().toString();
        try {
            jdbc.update("""
                INSERT INTO subject_category(id, org_id, name, name_unaccented, is_active,
                                            created_by, created_at)
                VALUES (?, ?, ?, ?, TRUE, ?, ?)
                """, id, orgId, name.trim(), TextNormalizer.unaccent(name), createdBy,
                Timestamp.from(Instant.now()));
        } catch (DuplicateKeyException duplicate) {
            throw duplicateCategory();
        }
        return require(id, orgId);
    }

    public SubjectCategoryResponse update(String id, String orgId, String name, String updatedBy) {
        require(id, orgId);
        try {
            jdbc.update("""
                UPDATE subject_category SET name=?, name_unaccented=?, updated_by=?, updated_at=?
                WHERE id=? AND org_id=?
                """, name.trim(), TextNormalizer.unaccent(name), updatedBy,
                Timestamp.from(Instant.now()), id, orgId);
        } catch (DuplicateKeyException duplicate) {
            throw duplicateCategory();
        }
        return require(id, orgId);
    }

    public SubjectCategoryResponse setActive(String id, String orgId, boolean active,
                                             String updatedBy) {
        require(id, orgId);
        jdbc.update("""
            UPDATE subject_category SET is_active=?, updated_by=?, updated_at=?
            WHERE id=? AND org_id=?
            """, active, updatedBy, Timestamp.from(Instant.now()), id, orgId);
        return require(id, orgId);
    }

    private SubjectCategoryResponse map(ResultSet rs) throws SQLException {
        Timestamp updated = rs.getTimestamp("updated_at");
        return new SubjectCategoryResponse(
            rs.getString("id"),
            rs.getString("name"),
            rs.getBoolean("is_active"),
            rs.getInt("subject_count"),
            rs.getTimestamp("created_at").toInstant(),
            updated == null ? null : updated.toInstant());
    }

    private AppException duplicateCategory() {
        return new AppException(ErrorCode.SUBJECT_CATEGORY_EXISTS,
            "Tên danh mục môn học đã tồn tại trong tổ chức");
    }
}
