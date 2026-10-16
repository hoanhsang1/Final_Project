
package com.mems.service;

import com.mems.exception.ApiException;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class OrganizationApprovalService {

    private final JdbcTemplate jdbc;

    public OrganizationApprovalService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
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
              AND r.code = 'ORG_OWNER'
            ORDER BY o.name
            """
        );
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
              AND r.code = 'ORG_OWNER'
            """,
            orgId
        );

        return Map.of(
            "organization", rows.get(0),
            "owners", owners,
            "modules", modules
        );
    }

    // Khoa organization va xac nhan dang pending
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

    // APPROVE: duyet toan bo module
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
                  WHERE r.code = 'ORG_OWNER'
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
    }

    // REJECT: tu choi toan bo yeu cau
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
                  WHERE r.code = 'ORG_OWNER'
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
    }
}
