package com.mems.repository;

import com.mems.dto.PositionRequest;
import com.mems.dto.PositionResponse;
import com.mems.exception.ApiException;
import org.springframework.http.HttpStatus;
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
        return jdbc.queryForList("SELECT id FROM `position` WHERE org_id=? ORDER BY name", String.class, orgId)
            .stream().map(id -> require(id, orgId, false)).toList();
    }

    public PositionResponse require(String id, String orgId, boolean lock) {
        var rows = jdbc.query("SELECT id, name, description, created_at FROM `position` WHERE id=? AND org_id=?"
            + (lock ? " FOR UPDATE" : ""),
            (rs, n) -> new PositionResponse(rs.getString("id"), rs.getString("name"), rs.getString("description"),
                rs.getTimestamp("created_at").toInstant(), permissions(id)), id, orgId);
        if (rows.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "POSITION_NOT_FOUND", "Position not found");
        return rows.get(0);
    }

    public Set<String> permissions(String id) {
        return new TreeSet<>(jdbc.queryForList(
            "SELECT permission_code FROM position_permission WHERE position_id=?", String.class, id));
    }

    public PositionResponse save(String id, String orgId, PositionRequest request, boolean create) {
        if (create) {
            jdbc.update("INSERT INTO `position`(id, org_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)",
                id, orgId, request.name().trim(), request.description(), Timestamp.from(Instant.now()));
        } else {
            jdbc.update("UPDATE `position` SET name=?, description=? WHERE id=? AND org_id=?",
                request.name().trim(), request.description(), id, orgId);
        }
        jdbc.update("DELETE FROM position_permission WHERE position_id=?", id);
        request.permissions().stream().sorted().forEach(code -> jdbc.update(
            "INSERT INTO position_permission(position_id, permission_code) VALUES (?, ?)", id, code));
        return require(id, orgId, false);
    }

    public void delete(String id, String orgId) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM member_position WHERE position_id=?", Integer.class, id);
        if (count != null && count > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "POSITION_IN_USE", "Position is assigned to members");
        }
        jdbc.update("DELETE FROM `position` WHERE id=? AND org_id=?", id, orgId);
    }
}
