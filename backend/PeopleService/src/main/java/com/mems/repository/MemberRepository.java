package com.mems.repository;

import com.mems.dto.AuthorizationResponse;
import com.mems.dto.MemberResponse;
import com.mems.exception.ApiException;
import com.mems.service.EffectivePermissionsService;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

@Repository
public class MemberRepository {
    private final JdbcTemplate jdbc;
    private final EffectivePermissionsService effectivePermissions;

    public MemberRepository(JdbcTemplate jdbc, EffectivePermissionsService effectivePermissions) {
        this.jdbc = jdbc;
        this.effectivePermissions = effectivePermissions;
    }

    public List<MemberResponse> list(String orgId, String departmentId) {
        return jdbc.queryForList(
            "SELECT user_id FROM department_member WHERE org_id=? AND department_id=? ORDER BY appointed_at",
            String.class, orgId, departmentId
        ).stream().map(id -> require(id, orgId, departmentId, false)).toList();
    }

    public MemberResponse require(String id, String orgId, String departmentId, boolean lock) {
        var rows = jdbc.query("""
            SELECT user_id, department_id, role, appointed_by, appointed_at
            FROM department_member WHERE user_id=? AND org_id=? AND department_id=?
            """ + (lock ? " FOR UPDATE" : ""),
            (rs, n) -> {
                Set<String> raw = permissions(id);
                Set<String> effective = effectivePermissions.compute(orgId, departmentId, raw);
                return new MemberResponse(
                    rs.getString("user_id"),
                    rs.getString("department_id"),
                    rs.getString("role"),
                    rs.getString("appointed_by"),
                    rs.getTimestamp("appointed_at").toInstant(),
                    positionIds(id, false),
                    effective
                );
            },
            id, orgId, departmentId
        );
        if (rows.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "MEMBER_NOT_FOUND", "Department member not found");
        return rows.get(0);
    }

    public Set<String> positionIds(String id, boolean lock) {
        return new TreeSet<>(jdbc.queryForList(
            "SELECT position_id FROM member_position WHERE user_id=? ORDER BY position_id" + (lock ? " FOR UPDATE" : ""),
            String.class, id
        ));
    }

    public Set<String> permissions(String id) {
        return new TreeSet<>(jdbc.queryForList("""
            SELECT DISTINCT pp.permission_code FROM member_position mp
            JOIN position_permission pp ON pp.position_id=mp.position_id WHERE mp.user_id=?
            """, String.class, id));
    }

    public void create(String userId, String orgId, String departmentId, String role, String appointedBy) {
        jdbc.update(
            "INSERT INTO department_member(user_id, org_id, department_id, role, appointed_by, appointed_at) VALUES (?, ?, ?, ?, ?, ?)",
            userId, orgId, departmentId, role, appointedBy, Timestamp.from(Instant.now())
        );
    }

    public void assign(String userId, String orgId, Set<String> positions) {
        jdbc.update("DELETE FROM member_position WHERE user_id=? AND org_id=?", userId, orgId);
        positions.stream().sorted().forEach(position ->
            jdbc.update("INSERT INTO member_position(user_id, position_id, org_id) VALUES (?, ?, ?)", userId, position, orgId)
        );
    }

    public void delete(String userId, String orgId) {
        jdbc.update("DELETE FROM department_member WHERE user_id=? AND org_id=?", userId, orgId);
    }

    public AuthorizationResponse authorization(String userId, String orgId) {
        var rows = jdbc.queryForList("SELECT department_id, role FROM department_member WHERE user_id=? AND org_id=?", userId, orgId);
        if (rows.isEmpty()) return new AuthorizationResponse("STAFF", null, Set.of());
        String deptId = (String) rows.get(0).get("department_id");
        Set<String> effective = effectivePermissions.compute(orgId, deptId, permissions(userId));
        return new AuthorizationResponse((String) rows.get(0).get("role"), deptId, effective);
    }
}
