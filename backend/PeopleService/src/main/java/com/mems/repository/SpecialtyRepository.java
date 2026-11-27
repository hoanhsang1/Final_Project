package com.mems.repository;

import com.mems.dto.SpecialtyResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.service.TextNormalizer;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

@Repository
public class SpecialtyRepository {
    private static final String SELECT = "SELECT id, name, category_id FROM specialty ";

    private final JdbcTemplate jdbc;

    public SpecialtyRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<SpecialtyResponse> listActive(String orgId, String q) {
        String term = TextNormalizer.likeContains(q);
        if (term == null) {
            return jdbc.query(
                SELECT + "WHERE org_id=? AND is_active=TRUE ORDER BY name",
                (rs, n) -> map(rs), orgId);
        }
        return jdbc.query(
            SELECT + "WHERE org_id=? AND is_active=TRUE "
                + "AND name_unaccented LIKE ? ESCAPE '!' ORDER BY name",
            (rs, n) -> map(rs), orgId, term);
    }

    public boolean existsName(String orgId, String unaccentedName) {
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM specialty WHERE org_id=? AND name_unaccented=?",
            Integer.class, orgId, unaccentedName);
        return count != null && count > 0;
    }

    public SpecialtyResponse require(String id, String orgId) {
        List<SpecialtyResponse> rows = jdbc.query(
            SELECT + "WHERE id=? AND org_id=?", (rs, n) -> map(rs), id, orgId);
        if (rows.isEmpty()) throw new AppException(ErrorCode.SPECIALTY_NOT_FOUND);
        return rows.get(0);
    }

    public SpecialtyResponse create(String id, String orgId, String name, String unaccentedName,
                                    String categoryId, String createdBy) {
        jdbc.update(
            "INSERT INTO specialty(id, org_id, name, name_unaccented, category_id, is_active, created_by, created_at) "
                + "VALUES (?,?,?,?,?,TRUE,?,?)",
            id, orgId, name, unaccentedName, categoryId, createdBy, Timestamp.from(Instant.now()));
        return new SpecialtyResponse(id, name, categoryId);
    }

    public SpecialtyResponse update(String id, String orgId, String name, String unaccentedName,
                                    String categoryId) {
        jdbc.update("""
            UPDATE specialty SET name=?, name_unaccented=?, category_id=?
            WHERE id=? AND org_id=?
            """, name, unaccentedName, categoryId, id, orgId);
        return require(id, orgId);
    }

    public List<SpecialtyResponse> findActiveByIds(String orgId, Collection<String> ids) {
        if (ids == null || ids.isEmpty()) return List.of();
        String placeholders = String.join(",", Collections.nCopies(ids.size(), "?"));
        List<Object> params = new ArrayList<>();
        params.add(orgId);
        params.addAll(ids);
        return jdbc.query(
            SELECT + "WHERE org_id=? AND is_active=TRUE AND id IN (" + placeholders + ") ORDER BY name",
            (rs, n) -> map(rs), params.toArray());
    }

    public List<SpecialtyResponse> forUser(String userId, String orgId) {
        return jdbc.query("""
            SELECT s.id, s.name, s.category_id FROM teacher_specialty ts
            JOIN specialty s ON s.id=ts.specialty_id AND s.org_id=ts.org_id
            WHERE ts.user_id=? AND ts.org_id=? ORDER BY s.name
            """, (rs, n) -> map(rs), userId, orgId);
    }

    public Map<String, List<SpecialtyResponse>> forUsers(String orgId, Collection<String> userIds) {
        if (userIds == null || userIds.isEmpty()) return Map.of();
        String placeholders = String.join(",", Collections.nCopies(userIds.size(), "?"));
        List<Object> params = new ArrayList<>();
        params.add(orgId);
        params.addAll(userIds);
        Map<String, List<SpecialtyResponse>> result = new HashMap<>();
        jdbc.query("""
            SELECT ts.user_id, s.id, s.name, s.category_id FROM teacher_specialty ts
            JOIN specialty s ON s.id=ts.specialty_id AND s.org_id=ts.org_id
            WHERE ts.org_id=? AND ts.user_id IN (""" + placeholders + ") ORDER BY s.name",
            rs -> {
                result.computeIfAbsent(rs.getString("user_id"), key -> new ArrayList<>())
                    .add(map(rs));
            }, params.toArray());
        return result;
    }

    private SpecialtyResponse map(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new SpecialtyResponse(rs.getString("id"), rs.getString("name"),
            rs.getString("category_id"));
    }
}
