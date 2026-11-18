package com.mems.controller;

import com.mems.service.OrganizationModuleService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/modules")
public class ModuleController {

    private final JdbcTemplate jdbc;
    private final OrganizationModuleService moduleService;

    public ModuleController(JdbcTemplate jdbc, OrganizationModuleService moduleService) {
        this.jdbc = jdbc;
        this.moduleService = moduleService;
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

    /** Trạng thái module của tổ chức trong JWT — dùng cho mọi vai trò. */
    @GetMapping("/status")
    public List<Map<String, Object>> status(@AuthenticationPrincipal Jwt jwt) {
        return moduleService.statusForMember(orgId(jwt));
    }

    private String orgId(Jwt jwt) {
        String orgId = jwt.getClaimAsString("orgId");
        if (orgId == null || orgId.isBlank()) {
            throw new com.mems.exception.AppException(
                com.mems.exception.ErrorCode.ORGANIZATION_REQUIRED,
                "No organization associated with this account");
        }
        return orgId;
    }
}
