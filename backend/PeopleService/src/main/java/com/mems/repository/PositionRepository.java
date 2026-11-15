package com.mems.repository;

import com.mems.dto.PositionRequest;
import com.mems.dto.PositionResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

@Repository
public class PositionRepository {
    private final JdbcTemplate jdbc;

    public PositionRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<PositionResponse> list(String orgId) {
        return jdbc.queryForList("SELECT id FROM `position` WHERE org_id=? AND deleted_at IS NULL ORDER BY name",
                String.class, orgId)
            .stream().map(id -> require(id, orgId, false)).toList();
    }

    public List<PositionResponse> listByDepartment(String orgId, String departmentId) {
        return jdbc.queryForList("""
            SELECT id FROM `position`
            WHERE org_id=? AND scope='DEPARTMENT' AND department_id=? AND deleted_at IS NULL
            ORDER BY name
            """, String.class, orgId, departmentId)
            .stream().map(id -> require(id, orgId, false)).toList();
    }

    /** Số người đang giữ (assignment ACTIVE) các chức danh này — khác nhau theo user_id. */
    public int distinctHolders(String orgId, Collection<String> positionIds) {
        if (positionIds == null || positionIds.isEmpty()) return 0;
        String placeholders = String.join(",", Collections.nCopies(positionIds.size(), "?"));
        List<Object> params = new ArrayList<>();
        params.add(orgId);
        params.addAll(positionIds);
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(DISTINCT user_id) FROM assignment"
                + " WHERE org_id=? AND status='ACTIVE' AND position_id IN (" + placeholders + ")",
            Integer.class, params.toArray());
        return count == null ? 0 : count;
    }

    public PositionResponse require(String id, String orgId, boolean lock) {
        var rows = jdbc.query("""
            SELECT id, name, description, created_at, profile_type, scope, department_id
            FROM `position` WHERE id=? AND org_id=? AND deleted_at IS NULL"""
                + (lock ? " FOR UPDATE" : ""),
            (rs, n) -> new PositionResponse(rs.getString("id"), rs.getString("name"), rs.getString("description"),
                rs.getTimestamp("created_at").toInstant(), permissions(id), rs.getString("profile_type"),
                bundleCodes(id), rs.getString("scope"), rs.getString("department_id")), id, orgId);
        if (rows.isEmpty()) throw new AppException(ErrorCode.POSITION_NOT_FOUND);
        return rows.get(0);
    }

    public Set<String> profileTypes(String orgId, Collection<String> ids) {
        if (ids == null || ids.isEmpty()) return Set.of();
        String placeholders = String.join(",", Collections.nCopies(ids.size(), "?"));
        List<Object> params = new ArrayList<>();
        params.add(orgId);
        params.addAll(ids);
        return new HashSet<>(jdbc.queryForList(
            "SELECT DISTINCT profile_type FROM `position` WHERE org_id=? AND deleted_at IS NULL AND id IN ("
                + placeholders + ")",
            String.class, params.toArray()));
    }

    public Set<String> permissions(String id) {
        return new TreeSet<>(jdbc.queryForList(
            "SELECT permission_code FROM position_permission WHERE position_id=?", String.class, id));
    }

    public Set<String> bundleCodes(String id) {
        return new TreeSet<>(jdbc.queryForList(
            "SELECT bundle_code FROM position_bundle WHERE position_id=?", String.class, id));
    }

    public Map<String, Set<String>> permissions(Collection<String> positionIds) {
        Map<String, Set<String>> result = new HashMap<>();
        if (positionIds == null) return result;
        for (String id : positionIds) result.put(id, permissions(id));
        return result;
    }

    public PositionResponse save(String id, String orgId, PositionRequest request, boolean create) {
        String scope = "ORGANIZATION".equals(request.scope()) ? "ORGANIZATION" : "DEPARTMENT";
        String departmentId = "ORGANIZATION".equals(scope) ? null : request.departmentId();
        if (create) {
            jdbc.update("""
                INSERT INTO `position`(id, org_id, name, description, created_at, scope, department_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, id, orgId, request.name().trim(), request.description(), Timestamp.from(Instant.now()),
                scope, departmentId);
        } else {
            jdbc.update("UPDATE `position` SET name=?, description=?, scope=?, department_id=?"
                    + " WHERE id=? AND org_id=? AND deleted_at IS NULL",
                request.name().trim(), request.description(), scope, departmentId, id, orgId);
        }
        jdbc.update("DELETE FROM position_permission WHERE position_id=?", id);
        new TreeSet<>(request.permissions()).forEach(code -> jdbc.update(
            "INSERT INTO position_permission(position_id, permission_code) VALUES (?, ?)", id, code));
        jdbc.update("DELETE FROM position_bundle WHERE position_id=?", id);
        new TreeSet<>(request.bundleCodes()).forEach(code -> jdbc.update(
            "INSERT INTO position_bundle(position_id, bundle_code) VALUES (?, ?)", id, code));
        return require(id, orgId, false);
    }

    public void delete(String id, String orgId) {
        Integer inUse = jdbc.queryForObject("""
            SELECT (SELECT COUNT(*) FROM member_position WHERE position_id=?)
                 + (SELECT COUNT(*) FROM assignment WHERE position_id=? AND status='ACTIVE')
            """, Integer.class, id, id);
        if (inUse != null && inUse > 0) {
            throw new AppException(ErrorCode.POSITION_IN_USE);
        }
        // Xoá mềm: assignment giữ lịch sử bổ nhiệm (FK không cascade).
        jdbc.update("UPDATE `position` SET deleted_at=? WHERE id=? AND org_id=? AND deleted_at IS NULL",
            Timestamp.from(Instant.now()), id, orgId);
    }
}
