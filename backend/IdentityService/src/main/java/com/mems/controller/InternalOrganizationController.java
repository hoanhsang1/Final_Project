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
     */
    @GetMapping("/{orgId}/modules")
    public List<String> getActiveModules(@PathVariable String orgId) {
        return jdbc.queryForList(
            """
            SELECT module_code
            FROM organization_module
            WHERE org_id = ? AND status = 'active'
            ORDER BY module_code
            """,
            String.class,
            orgId
        );
    }

    /**
     * Returns full module status rows so guards can distinguish 'disabled' vs 'locked'
     * and implement read-only mode (DEC-11).
     */
    @GetMapping("/{orgId}/modules/status")
    public List<Map<String, Object>> getModuleStatus(@PathVariable String orgId) {
        return jdbc.queryForList(
            """
            SELECT m.code, m.name, m.is_core,
                   COALESCE(om.status, 'not_registered') AS status,
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


