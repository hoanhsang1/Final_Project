package com.mems.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Nhật ký thao tác của PeopleService trong một tổ chức. */
@Repository
public class AuditLogRepository {
    public record AuditLogRow(String id, String action, String actorUserId, String actorName,
                              String targetId, String details, Instant createdAt) {}

    private final JdbcTemplate jdbc;

    public AuditLogRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public long count(String orgId, String action, String actorUserId, Instant from, Instant to) {
        List<Object> args = new ArrayList<>();
        Long total = jdbc.queryForObject(
            "SELECT COUNT(*) FROM people_audit_log a WHERE " + filters(orgId, action, actorUserId, from, to, args),
            Long.class, args.toArray());
        return total == null ? 0 : total;
    }

    public List<AuditLogRow> list(String orgId, String action, String actorUserId, Instant from,
                                  Instant to, int limit, long offset) {
        List<Object> args = new ArrayList<>();
        String where = filters(orgId, action, actorUserId, from, to, args);
        args.add(limit);
        args.add(offset);
        String sql = "SELECT a.id, a.action, a.actor_user_id, a.target_id, a.details, a.created_at, "
            + "sp.full_name AS actor_name "
            + "FROM people_audit_log a "
            + "LEFT JOIN staff_profile sp ON sp.user_id=a.actor_user_id AND sp.org_id=a.org_id "
            + "WHERE " + where + " "
            + "ORDER BY a.created_at DESC, a.id DESC LIMIT ? OFFSET ?";
        return jdbc.query(sql, (rs, n) -> new AuditLogRow(
            rs.getString("id"), rs.getString("action"), rs.getString("actor_user_id"),
            rs.getString("actor_name"), rs.getString("target_id"), rs.getString("details"),
            rs.getTimestamp("created_at").toInstant()), args.toArray());
    }

    private String filters(String orgId, String action, String actorUserId, Instant from,
                           Instant to, List<Object> args) {
        StringBuilder sql = new StringBuilder("a.org_id=?");
        args.add(orgId);
        if (action != null && !action.isBlank()) {
            sql.append(" AND a.action=?");
            args.add(action.trim());
        }
        if (actorUserId != null && !actorUserId.isBlank()) {
            sql.append(" AND a.actor_user_id=?");
            args.add(actorUserId.trim());
        }
        if (from != null) {
            sql.append(" AND a.created_at>=?");
            args.add(Timestamp.from(from));
        }
        if (to != null) {
            sql.append(" AND a.created_at<=?");
            args.add(Timestamp.from(to));
        }
        return sql.toString();
    }
}
