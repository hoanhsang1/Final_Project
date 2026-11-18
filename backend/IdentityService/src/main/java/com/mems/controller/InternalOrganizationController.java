package com.mems.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/internal/orgs")
public class InternalOrganizationController {

    private final JdbcTemplate jdbc;

    public InternalOrganizationController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Returns module codes that are truly usable by the org (status = 'active').
     * 'disabled' and 'locked' modules are intentionally excluded so guards in other
     * services can correctly block writes (and allow reads via requireModuleForRead).
     * Core modules are always active even when the organization has no
     * organization_module row (legacy organizations).
     */
    @GetMapping("/{orgId}/modules")
    public List<String> getActiveModules(@PathVariable String orgId) {
        return jdbc.queryForList(
            """
            SELECT m.code
            FROM module m
            LEFT JOIN organization_module om ON om.module_code = m.code AND om.org_id = ?
            WHERE m.is_active = TRUE
              AND (m.is_core = TRUE OR om.status = 'active')
            ORDER BY m.code
            """,
            String.class,
            orgId
        );
    }

    /**
     * Returns full module status rows so guards can distinguish 'disabled' vs 'locked'
     * and implement read-only mode (DEC-11). Core modules that lack an
     * organization_module row are reported as 'active', never 'not_registered'.
     */
    @GetMapping("/{orgId}/modules/status")
    public List<Map<String, Object>> getModuleStatus(@PathVariable String orgId) {
        return jdbc.queryForList(
            """
            SELECT m.code, m.name, m.is_core,
                   CASE WHEN m.is_core THEN 'active'
                        ELSE COALESCE(om.status, 'not_registered') END AS status,
                   CASE WHEN om.status = 'locked' THEN TRUE ELSE FALSE END AS is_locked_by_admin
            FROM module m
            LEFT JOIN organization_module om ON om.module_code = m.code AND om.org_id = ?
            WHERE m.is_active = TRUE
            ORDER BY m.is_core DESC, m.code
            """,
            orgId
        );
    }
}


