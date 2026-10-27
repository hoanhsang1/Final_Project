package com.mems.config;

import com.mems.service.PermissionCatalog;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Component
public class IdentityDataInitializer implements ApplicationRunner {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    private final Environment env;

    public IdentityDataInitializer(JdbcTemplate jdbc, PasswordEncoder encoder, Environment env) {
        this.jdbc = jdbc;
        this.encoder = encoder;
        this.env = env;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        for (String role : new String[]{"OWNER", "MANAGER", "STAFF"}) {
            jdbc.update("""
                INSERT INTO role(code,name,scope,description) VALUES (?,?,'organization',?)
                ON DUPLICATE KEY UPDATE name=VALUES(name)
                """, role, role, "Department access: " + role);
        }
        for (var permission : PermissionCatalog.ENTRIES) {
            jdbc.update("""
                INSERT INTO permission(code,description) VALUES (?,?)
                ON DUPLICATE KEY UPDATE description=VALUES(description)
                """, permission.code(), permission.description());
            jdbc.update("""
                INSERT INTO role_permission(role_id,permission_id)
                SELECT r.id,p.id FROM role r JOIN permission p ON p.code=?
                WHERE r.code IN ('OWNER','ORG_OWNER')
                ON DUPLICATE KEY UPDATE permission_id=VALUES(permission_id)
                """, permission.code());
        }
        if (!env.getProperty("OWNER_BOOTSTRAP_ENABLED", Boolean.class, false)) return;

        String orgId = required("OWNER_BOOTSTRAP_ORG_ID");
        String email = required("OWNER_BOOTSTRAP_EMAIL").trim();
        String username = env.getProperty("OWNER_BOOTSTRAP_USERNAME", "").trim();
        if (username.isBlank()) username = email;
        String password = required("OWNER_BOOTSTRAP_PASSWORD");
        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$") || email.length() > 255
                || username.isBlank() || username.length() > 100
                || password.length() < 12 || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalStateException("Invalid OWNER bootstrap email, username or password (12 characters minimum, 72 UTF-8 bytes maximum)");
        }
        var organizations = jdbc.queryForList(
            "SELECT id FROM organization WHERE id=? AND status='active' FOR UPDATE",
            String.class, orgId);
        if (organizations.isEmpty()) throw new IllegalStateException("Bootstrap OWNER requires an existing active organization");

        // Existing accounts are never promoted or reset by bootstrap.
        var existing = jdbc.queryForList(
            "SELECT id FROM account WHERE username=? OR email=?", String.class, username, email);
        if (!existing.isEmpty()) {
            Integer owners = jdbc.queryForObject("""
                SELECT COUNT(DISTINCT a.id) FROM account a
                JOIN account_role ar ON ar.account_id=a.id JOIN role r ON r.id=ar.role_id
                WHERE a.username=? AND a.email=? AND a.org_id=? AND r.code IN ('OWNER','ORG_OWNER')
                """, Integer.class, username, email, orgId);
            if (owners == null || owners != 1) throw new IllegalStateException("OWNER bootstrap conflicts with an existing account");
            return;
        }
        String accountId = UUID.randomUUID().toString();
        jdbc.update("""
            INSERT INTO account(id,org_id,username,email,password_hash,status)
            VALUES (?,?,?,?,?,'active')
            """, accountId, orgId, username, email, encoder.encode(password));
        jdbc.update("""
            INSERT INTO account_role(account_id,role_id)
            SELECT ?,id FROM role WHERE code='OWNER'
            """, accountId);
    }

    private String required(String key) {
        String value = env.getProperty(key);
        if (value == null || value.isBlank()) throw new IllegalStateException("Missing environment variable: " + key);
        return value;
    }
}
