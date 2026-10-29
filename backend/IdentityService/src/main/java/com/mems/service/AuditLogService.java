package com.mems.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class AuditLogService {

    private final JdbcTemplate jdbc;

    public AuditLogService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAuditLogs(
            int page, int size, String action, String organizationId, String accountId,
            String from, String to, String keyword, String sort
    ) {
        if (page < 1) page = 1;
        if (size < 1) size = 20;

        try {
            StringBuilder where = new StringBuilder(" WHERE 1=1 ");
            List<Object> params = new ArrayList<>();

            if (action != null && !action.isBlank()) {
                String[] actions = action.split(",");
                where.append(" AND al.action IN (");
                for (int i = 0; i < actions.length; i++) {
                    if (i > 0) where.append(", ");
                    where.append("?");
                    params.add(actions[i].trim());
                }
                where.append(")");
            }

            if (organizationId != null && !organizationId.isBlank()) {
                where.append(" AND al.org_id = ?");
                params.add(organizationId.trim());
            }

            if (accountId != null && !accountId.isBlank()) {
                where.append(" AND (al.actor_account_id = ? OR al.entity_id = ?)");
                params.add(accountId.trim());
                params.add(accountId.trim());
            }

            if (from != null && !from.isBlank()) {
                where.append(" AND al.created_at >= ?");
                params.add(from.trim() + " 00:00:00");
            }

            if (to != null && !to.isBlank()) {
                where.append(" AND al.created_at <= ?");
                params.add(to.trim() + " 23:59:59");
            }

            if (keyword != null && !keyword.isBlank()) {
                where.append(" AND (LOWER(al.action) LIKE ? OR LOWER(a.username) LIKE ? OR LOWER(o.name) LIKE ?)");
                String k = "%" + keyword.trim().toLowerCase() + "%";
                params.add(k);
                params.add(k);
                params.add(k);
            }

            String countSql = "SELECT COUNT(*) FROM audit_log al " +
                              "LEFT JOIN account a ON a.id = al.actor_account_id " +
                              "LEFT JOIN organization o ON o.id = al.org_id " +
                              where;
            Long total = jdbc.queryForObject(countSql, Long.class, params.toArray());
            if (total == null) total = 0L;

            String orderBy = " ORDER BY al.created_at DESC ";
            if (sort != null && !sort.isBlank()) {
                String[] parts = sort.split(",");
                String field = parts[0].trim();
                String dir = parts.length > 1 && parts[1].trim().equalsIgnoreCase("asc") ? "ASC" : "DESC";
                if ("created_at".equalsIgnoreCase(field)) {
                    orderBy = " ORDER BY al.created_at " + dir;
                } else if ("action".equalsIgnoreCase(field)) {
                    orderBy = " ORDER BY al.action " + dir;
                }
            }

            int offset = (page - 1) * size;
            String querySql = "SELECT al.id, al.created_at, al.action, " +
                              "COALESCE(a.username, 'system') AS actor_username, " +
                              "al.entity_type AS target_type, al.entity_id AS target_id, " +
                              "COALESCE(o.name, acc.username, al.entity_id, '') AS target_name, " +
                              "NULL AS description " +
                              "FROM audit_log al " +
                              "LEFT JOIN account a ON a.id = al.actor_account_id " +
                              "LEFT JOIN organization o ON o.id = al.org_id " +
                              "LEFT JOIN account acc ON acc.id = al.entity_id " +
                              where + orderBy + " LIMIT ? OFFSET ?";

            List<Object> queryParams = new ArrayList<>(params);
            queryParams.add(size);
            queryParams.add(offset);

            List<Map<String, Object>> items = jdbc.queryForList(querySql, queryParams.toArray());

            return Map.of(
                "items", items,
                "total", total,
                "page", page,
                "size", size
            );
        } catch (Exception e) {
            // If table does not exist or schema issue, return empty envelope gracefully
            return Map.of(
                "items", List.of(),
                "total", 0,
                "page", page,
                "size", size
            );
        }
    }
}

