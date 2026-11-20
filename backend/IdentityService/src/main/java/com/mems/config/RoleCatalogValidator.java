package com.mems.config;

import com.mems.service.RoleCatalog;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Fail-fast check that every role the authorization model depends on exists.
 *
 * <p>Runs after {@link IdentityDataInitializer}; a fresh database that skipped
 * seeding previously failed much later with an opaque registration error.</p>
 */
@Component
@Order(1)
public class RoleCatalogValidator implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(RoleCatalogValidator.class);

    private final JdbcTemplate jdbc;

    public RoleCatalogValidator(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<String> missing = new ArrayList<>();
        for (String role : RoleCatalog.REQUIRED_ORGANIZATION_ROLES) {
            if (!exists(role, "organization")) missing.add(role);
        }
        if (!exists(RoleCatalog.SUPER_ADMIN, "platform")) missing.add(RoleCatalog.SUPER_ADMIN);
        if (!missing.isEmpty()) {
            throw new IllegalStateException("Missing required roles: " + String.join(", ", missing));
        }
        log.info("Role catalog verified: {} organization role(s) + platform admin",
            RoleCatalog.REQUIRED_ORGANIZATION_ROLES.size());
    }

    private boolean exists(String code, String scope) {
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM role WHERE code=? AND scope=?", Integer.class, code, scope);
        return count != null && count > 0;
    }
}
