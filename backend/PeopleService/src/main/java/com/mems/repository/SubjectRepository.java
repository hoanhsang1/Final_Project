package com.mems.repository;

import com.mems.dto.SubjectResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.service.TextNormalizer;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class SubjectRepository {
    private final JdbcTemplate jdbc;

    public SubjectRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record SubjectRow(String id, String name) {}

    public List<SubjectResponse> listActive(String orgId, String q) {
        String term = TextNormalizer.likeContains(q);
        if (term == null) {
            return jdbc.query(
                "SELECT id, name FROM subject WHERE org_id=? AND is_active=TRUE ORDER BY name",
                (rs, n) -> new SubjectResponse(rs.getString("id"), rs.getString("name")), orgId);
        }
        return jdbc.query(
            "SELECT id, name FROM subject WHERE org_id=? AND is_active=TRUE "
                + "AND name_unaccented LIKE ? ESCAPE '!' ORDER BY name",
            (rs, n) -> new SubjectResponse(rs.getString("id"), rs.getString("name")), orgId, term);
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
}
