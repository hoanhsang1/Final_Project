package com.mems.service;

import com.mems.exception.ApiException;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class OrganizationApprovalService {

    private final JdbcTemplate jdbc;

    public OrganizationApprovalService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void recordAudit(String orgId, String actorId, String action, String entityType, String entityId) {
        try {
            jdbc.update(
                """
                INSERT INTO audit_log (id, org_id, actor_account_id, action, entity_type, entity_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                """,
                UUID.randomUUID().toString(), orgId, actorId, action, entityType, entityId
            );
        } catch (Exception ignored) {
            // Log table might be optional in some test environments
        }
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPending() {
        return jdbc.queryForList(
            """
            SELECT
                o.id,
                o.name,
                o.org_type,
                o.status,
                a.username AS owner_username,
                a.email AS owner_email
            FROM organization o
            JOIN account a ON a.org_id = o.id
            JOIN account_role ar ON ar.account_id = a.id
            JOIN role r ON r.id = ar.role_id
            WHERE o.status = 'pending'
              AND r.code IN ('ORG_OWNER', 'OWNER')
            ORDER BY o.name
            """
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getOrganizations(int page, int size, String status, String orgType, String keyword, String sort) {
        if (page < 1) page = 1;
        if (size < 1) size = 20;

        StringBuilder where = new StringBuilder(" WHERE 1=1 ");
        List<Object> params = new ArrayList<>();

        if (status != null && !status.isBlank()) {
            String[] statuses = status.split(",");
            where.append(" AND o.status IN (");
            for (int i = 0; i < statuses.length; i++) {
                if (i > 0) where.append(", ");
                where.append("?");
                params.add(statuses[i].trim().toLowerCase());
            }
            where.append(")");
        }

        if (orgType != null && !orgType.isBlank()) {
            where.append(" AND o.org_type = ?");
            params.add(orgType.trim().toLowerCase());
        }

        if (keyword != null && !keyword.isBlank()) {
            where.append(" AND (LOWER(o.name) LIKE ? OR LOWER(a.username) LIKE ? OR LOWER(a.email) LIKE ?)");
            String k = "%" + keyword.trim().toLowerCase() + "%";
            params.add(k);
            params.add(k);
            params.add(k);
        }

        String countSql = "SELECT COUNT(DISTINCT o.id) FROM organization o " +
                          "LEFT JOIN account a ON a.org_id = o.id " +
                          "LEFT JOIN account_role ar ON ar.account_id = a.id " +
                          "LEFT JOIN role r ON r.id = ar.role_id AND r.code IN ('ORG_OWNER', 'OWNER') " +
                          where;
        Long total = jdbc.queryForObject(countSql, Long.class, params.toArray());
        if (total == null) total = 0L;

        String orderBy = " ORDER BY o.name ASC ";
        if (sort != null && !sort.isBlank()) {
            String[] parts = sort.split(",");
            String field = parts[0].trim();
            String dir = parts.length > 1 && parts[1].trim().equalsIgnoreCase("desc") ? "DESC" : "ASC";
            if ("name".equalsIgnoreCase(field)) {
                orderBy = " ORDER BY o.name " + dir;
            } else if ("created_at".equalsIgnoreCase(field)) {
                orderBy = " ORDER BY o.created_at " + dir;
            } else if ("status".equalsIgnoreCase(field)) {
                orderBy = " ORDER BY o.status " + dir;
            }
        }

        int offset = (page - 1) * size;
        String querySql = "SELECT o.id, o.name, o.org_type, o.status, " +
                          "MIN(o.created_at) AS created_at, " +
                          "MIN(a.username) AS owner_username, MIN(a.email) AS owner_email " +
                          "FROM organization o " +
                          "LEFT JOIN account a ON a.org_id = o.id " +
                          "LEFT JOIN account_role ar ON ar.account_id = a.id " +
                          "LEFT JOIN role r ON r.id = ar.role_id AND r.code IN ('ORG_OWNER', 'OWNER') " +
                          where +
                          " GROUP BY o.id, o.name, o.org_type, o.status " +
                          orderBy + " LIMIT ? OFFSET ?";

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
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getOptions() {
        return jdbc.queryForList("SELECT id, name FROM organization ORDER BY name ASC");
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getDetail(String orgId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            """
            SELECT id, name, org_type, status
            FROM organization
            WHERE id = ?
            """,
            orgId
        );

        if (rows.isEmpty()) {
            throw new ApiException(
                HttpStatus.NOT_FOUND,
                "Organization not found"
            );
        }

        List<Map<String, Object>> modules = jdbc.queryForList(
            """
            SELECT
                m.code,
                m.name,
                om.status
            FROM organization_module om
            JOIN module m ON m.code = om.module_code
            WHERE om.org_id = ?
            ORDER BY m.code
            """,
            orgId
        );

        List<Map<String, Object>> owners = jdbc.queryForList(
            """
            SELECT a.id, a.username, a.email, a.status
            FROM account a
            JOIN account_role ar ON ar.account_id = a.id
            JOIN role r ON r.id = ar.role_id
            WHERE a.org_id = ?
              AND r.code IN ('ORG_OWNER', 'OWNER')
            """,
            orgId
        );

        return Map.of(
            "organization", rows.get(0),
            "owners", owners,
            "modules", modules
        );
    }

    private void requirePending(String orgId) {
        List<String> statuses = jdbc.queryForList(
            """
            SELECT status
            FROM organization
            WHERE id = ?
            FOR UPDATE
            """,
            String.class,
            orgId
        );

        if (statuses.isEmpty()) {
            throw new ApiException(
                HttpStatus.NOT_FOUND,
                "Organization not found"
            );
        }

        if (!"pending".equals(statuses.get(0))) {
            throw new ApiException(
                HttpStatus.CONFLICT,
                "Organization has already been reviewed"
            );
        }
    }

    @Transactional
    public void approve(String orgId) {
        requirePending(orgId);

        jdbc.update(
            """
            UPDATE organization
            SET status = 'active'
            WHERE id = ?
            """,
            orgId
        );

        jdbc.update(
            """
            UPDATE account
            SET status = 'active'
            WHERE org_id = ?
              AND status = 'pending'
              AND id IN (
                  SELECT ar.account_id
                  FROM account_role ar
                  JOIN role r ON r.id = ar.role_id
                  WHERE r.code IN ('ORG_OWNER', 'OWNER')
              )
            """,
            orgId
        );

        jdbc.update(
            """
            UPDATE organization_module
            SET status = 'active'
            WHERE org_id = ?
              AND status = 'requested'
            """,
            orgId
        );

        recordAudit(orgId, null, "ORG_APPROVED", "ORGANIZATION", orgId);
    }

    @Transactional
    public void reject(String orgId) {
        requirePending(orgId);

        jdbc.update(
            """
            UPDATE organization
            SET status = 'rejected'
            WHERE id = ?
            """,
            orgId
        );

        jdbc.update(
            """
            UPDATE account
            SET status = 'disabled'
            WHERE org_id = ?
              AND status = 'pending'
              AND id IN (
                  SELECT ar.account_id
                  FROM account_role ar
                  JOIN role r ON r.id = ar.role_id
                  WHERE r.code IN ('ORG_OWNER', 'OWNER')
              )
            """,
            orgId
        );

        jdbc.update(
            """
            UPDATE organization_module
            SET status = 'rejected'
            WHERE org_id = ?
              AND status = 'requested'
            """,
            orgId
        );

        recordAudit(orgId, null, "ORG_REJECTED", "ORGANIZATION", orgId);
    }

    @Transactional
    public void suspend(String orgId, String reason) {
        List<String> statuses = jdbc.queryForList("SELECT status FROM organization WHERE id = ?", String.class, orgId);
        if (statuses.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Organization not found");
        }
        jdbc.update("UPDATE organization SET status = 'suspended' WHERE id = ?", orgId);
        jdbc.update(
            """
            UPDATE account SET status = 'disabled'
            WHERE org_id = ?
              AND id IN (
                  SELECT ar.account_id FROM account_role ar
                  JOIN role r ON r.id = ar.role_id
                  WHERE r.code IN ('ORG_OWNER', 'OWNER')
              )
            """,
            orgId
        );
        recordAudit(orgId, null, "ORG_SUSPENDED", "ORGANIZATION", orgId);
    }

    @Transactional
    public void reactivate(String orgId, String reason) {
        List<String> statuses = jdbc.queryForList("SELECT status FROM organization WHERE id = ?", String.class, orgId);
        if (statuses.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Organization not found");
        }
        jdbc.update("UPDATE organization SET status = 'active' WHERE id = ?", orgId);
        jdbc.update(
            """
            UPDATE account SET status = 'active'
            WHERE org_id = ?
              AND id IN (
                  SELECT ar.account_id FROM account_role ar
                  JOIN role r ON r.id = ar.role_id
                  WHERE r.code IN ('ORG_OWNER', 'OWNER')
              )
            """,
            orgId
        );
        recordAudit(orgId, null, "ORG_REACTIVATED", "ORGANIZATION", orgId);
    }

    @Transactional
    public void updateModules(String orgId, List<String> modules) {
        List<String> statuses = jdbc.queryForList("SELECT status FROM organization WHERE id = ?", String.class, orgId);
        if (statuses.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Organization not found");
        }
        if ("suspended".equals(statuses.get(0))) {
            throw new ApiException(HttpStatus.CONFLICT, "Organization is suspended");
        }
        if (modules == null || modules.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Modules list cannot be empty");
        }

        for (String m : modules) {
            Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM module WHERE code = ? AND is_active = TRUE", Integer.class, m);
            if (count == null || count == 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid module: " + m);
            }
        }

        jdbc.update("UPDATE organization_module SET status = 'rejected' WHERE org_id = ?", orgId);

        for (String m : modules) {
            int updated = jdbc.update(
                "UPDATE organization_module SET status = 'active' WHERE org_id = ? AND module_code = ?",
                orgId, m
            );
            if (updated == 0) {
                jdbc.update(
                    "INSERT INTO organization_module (org_id, module_code, status) VALUES (?, ?, 'active')",
                    orgId, m
                );
            }
        }

        recordAudit(orgId, null, "ORG_MODULES_UPDATED", "ORGANIZATION", orgId);
    }
}
