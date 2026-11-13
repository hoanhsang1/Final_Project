package com.mems.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/internal/orgs")
public class InternalOrganizationController {

    private final JdbcTemplate jdbc;

    public InternalOrganizationController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

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
}

