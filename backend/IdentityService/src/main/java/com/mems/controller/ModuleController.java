
package com.mems.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/modules")
public class ModuleController {

    private final JdbcTemplate jdbc;

    public ModuleController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<Map<String, Object>> getModules() {
        return jdbc.queryForList(
            """
            SELECT code, name
            FROM module
            WHERE is_active = TRUE
            ORDER BY code
            """
        );
    }
}
