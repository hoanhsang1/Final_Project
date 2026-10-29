package com.mems.service;

import com.mems.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class AccountService {

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;

    public AccountService(JdbcTemplate jdbc, PasswordEncoder passwordEncoder) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAccounts(
            int page, int size, String organizationId, String role, String status, String keyword, String sort
    ) {
        if (page < 1) page = 1;
        if (size < 1) size = 20;

        StringBuilder where = new StringBuilder(" WHERE 1=1 ");
        List<Object> params = new ArrayList<>();

        if (organizationId != null && !organizationId.isBlank()) {
            where.append(" AND a.org_id = ?");
            params.add(organizationId.trim());
        }

        if (role != null && !role.isBlank()) {
            where.append(" AND r.code = ?");
            params.add(role.trim());
        }

        if (status != null && !status.isBlank()) {
            String[] statuses = status.split(",");
            where.append(" AND a.status IN (");
            for (int i = 0; i < statuses.length; i++) {
                if (i > 0) where.append(", ");
                where.append("?");
                params.add(statuses[i].trim().toLowerCase());
            }
            where.append(")");
        }

        if (keyword != null && !keyword.isBlank()) {
            where.append(" AND (LOWER(a.username) LIKE ? OR LOWER(a.email) LIKE ? OR LOWER(o.name) LIKE ?)");
            String k = "%" + keyword.trim().toLowerCase() + "%";
            params.add(k);
            params.add(k);
            params.add(k);
        }

        String countSql = "SELECT COUNT(DISTINCT a.id) FROM account a " +
                          "LEFT JOIN organization o ON o.id = a.org_id " +
                          "LEFT JOIN account_role ar ON ar.account_id = a.id " +
                          "LEFT JOIN role r ON r.id = ar.role_id " +
                          where;
        Long total = jdbc.queryForObject(countSql, Long.class, params.toArray());
        if (total == null) total = 0L;

        String orderBy = " ORDER BY a.username ASC ";
        if (sort != null && !sort.isBlank()) {
            String[] parts = sort.split(",");
            String field = parts[0].trim();
            String dir = parts.length > 1 && parts[1].trim().equalsIgnoreCase("desc") ? "DESC" : "ASC";
            if ("username".equalsIgnoreCase(field)) {
                orderBy = " ORDER BY a.username " + dir;
            } else if ("created_at".equalsIgnoreCase(field)) {
                orderBy = " ORDER BY a.created_at " + dir;
            } else if ("status".equalsIgnoreCase(field)) {
                orderBy = " ORDER BY a.status " + dir;
            } else if ("email".equalsIgnoreCase(field)) {
                orderBy = " ORDER BY a.email " + dir;
            }
        }

        int offset = (page - 1) * size;
        String querySql = "SELECT a.id, a.username, a.email, a.username AS full_name, " +
                          "a.org_id AS organization_id, o.name AS organization_name, " +
                          "COALESCE(r.code, 'STAFF') AS role, a.status, a.created_at, a.last_login_at " +
                          "FROM account a " +
                          "LEFT JOIN organization o ON o.id = a.org_id " +
                          "LEFT JOIN account_role ar ON ar.account_id = a.id " +
                          "LEFT JOIN role r ON r.id = ar.role_id " +
                          where +
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
    public Map<String, Object> getAccount(String accountId) {
        List<Map<String, Object>> items = jdbc.queryForList(
            """
            SELECT a.id, a.username, a.email, a.username AS full_name,
                   a.org_id AS organization_id, o.name AS organization_name,
                   COALESCE(r.code, 'STAFF') AS role, a.status, a.created_at, a.last_login_at
            FROM account a
            LEFT JOIN organization o ON o.id = a.org_id
            LEFT JOIN account_role ar ON ar.account_id = a.id
            LEFT JOIN role r ON r.id = ar.role_id
            WHERE a.id = ?
            """,
            accountId
        );

        if (items.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Account not found");
        }

        return items.get(0);
    }

    @Transactional
    public Map<String, Object> createAccount(Map<String, Object> payload) {
        String email = payload.get("email") != null ? payload.get("email").toString().trim() : null;
        String role = payload.get("role") != null ? payload.get("role").toString().trim() : null;
        String orgId = payload.get("organization_id") != null ? payload.get("organization_id").toString().trim() : null;

        if (email == null || email.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email is required");
        }
        if (role == null || role.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Role is required");
        }
        if ("SUPER_ADMIN".equalsIgnoreCase(role)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cannot assign SUPER_ADMIN role");
        }

        Integer existingEmail = jdbc.queryForObject(
            "SELECT COUNT(*) FROM account WHERE email = ?", Integer.class, email
        );
        if (existingEmail != null && existingEmail > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already exists");
        }

        // Generate username
        String baseUsername = email.contains("@") ? email.substring(0, email.indexOf('@')).replaceAll("[^a-zA-Z0-9_.-]", "") : email;
        if (baseUsername.isBlank()) baseUsername = "user";
        String username = baseUsername;
        int attempt = 1;
        while (Boolean.TRUE.equals(jdbc.queryForObject("SELECT COUNT(*) > 0 FROM account WHERE username = ?", Boolean.class, username))) {
            username = baseUsername + attempt;
            attempt++;
        }

        // Find role
        List<Long> roleIds = jdbc.queryForList("SELECT id FROM role WHERE code = ?", Long.class, role);
        if (roleIds.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid role: " + role);
        }
        Long roleId = roleIds.get(0);

        String accountId = UUID.randomUUID().toString();
        String tempPassword = UUID.randomUUID().toString().replace("-", "").substring(0, 10) + "A1!";

        jdbc.update(
            """
            INSERT INTO account (id, org_id, username, email, password_hash, status)
            VALUES (?, ?, ?, ?, ?, 'active')
            """,
            accountId, orgId, username, email, passwordEncoder.encode(tempPassword)
        );

        jdbc.update("INSERT INTO account_role (account_id, role_id) VALUES (?, ?)", accountId, roleId);

        return getAccount(accountId);
    }

    @Transactional
    public void updateStatus(String accountId, String status, String reason) {
        if (status == null || (!status.equalsIgnoreCase("active") && !status.equalsIgnoreCase("locked") && !status.equalsIgnoreCase("disabled"))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Status must be active, locked, or disabled");
        }
        int rows = jdbc.update("UPDATE account SET status = ? WHERE id = ?", status.toLowerCase(), accountId);
        if (rows == 0) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Account not found");
        }
    }

    @Transactional
    public void updateRole(String accountId, String role) {
        if (role == null || role.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Role is required");
        }
        if ("SUPER_ADMIN".equalsIgnoreCase(role)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cannot assign SUPER_ADMIN role");
        }

        List<Long> roleIds = jdbc.queryForList("SELECT id FROM role WHERE code = ?", Long.class, role);
        if (roleIds.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid role: " + role);
        }
        Long roleId = roleIds.get(0);

        Integer exists = jdbc.queryForObject("SELECT COUNT(*) FROM account WHERE id = ?", Integer.class, accountId);
        if (exists == null || exists == 0) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Account not found");
        }

        jdbc.update("DELETE FROM account_role WHERE account_id = ?", accountId);
        jdbc.update("INSERT INTO account_role (account_id, role_id) VALUES (?, ?)", accountId, roleId);
    }

    @Transactional
    public void resetPassword(String accountId, String newPassword) {
        Integer exists = jdbc.queryForObject("SELECT COUNT(*) FROM account WHERE id = ?", Integer.class, accountId);
        if (exists == null || exists == 0) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Account not found");
        }

        if (newPassword != null && !newPassword.isBlank()) {
            if (newPassword.length() < 8) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Password must be at least 8 characters");
            }
            jdbc.update("UPDATE account SET password_hash = ? WHERE id = ?",
                passwordEncoder.encode(newPassword), accountId);
        } else {
            String tempPassword = UUID.randomUUID().toString().replace("-", "").substring(0, 10) + "A1!";
            jdbc.update("UPDATE account SET password_hash = ? WHERE id = ?",
                passwordEncoder.encode(tempPassword), accountId);
        }
    }
}

