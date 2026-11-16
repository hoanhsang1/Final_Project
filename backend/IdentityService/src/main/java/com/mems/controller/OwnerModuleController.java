package com.mems.controller;

import com.mems.dto.ModuleToggleRequest;
import com.mems.service.OrganizationModuleService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * API for the OWNER to manage Optional modules of their own organization (BE-00.2 §3.1).
 *
 * <p>All routes are under {@code /api/v1/organizations/my/} — the organization is always
 * resolved from the JWT claim {@code orgId}. The client never supplies an orgId here.</p>
 *
 * <p>Security: protected by {@code SecurityConfig} → {@code ROLE_OWNER} only.
 * SUPER_ADMIN uses {@link AdminModuleController} instead.</p>
 */
@RestController
@RequestMapping("/api/v1/organizations/my")
public class OwnerModuleController {

    private final OrganizationModuleService moduleService;

    public OwnerModuleController(OrganizationModuleService moduleService) {
        this.moduleService = moduleService;
    }

    /**
     * GET /api/v1/organizations/my/modules
     * Returns the module status for the caller's organization.
     * Permission: ROLE_OWNER
     */
    @GetMapping("/modules")
    public ResponseEntity<List<Map<String, Object>>> listModules(
            @AuthenticationPrincipal Jwt jwt) {
        String orgId = extractOrgId(jwt);
        return ResponseEntity.ok(moduleService.listForOwner(orgId));
    }

    /**
     * PATCH /api/v1/organizations/my/modules/{moduleCode}
     * Owner enables or disables an Optional module.
     * Permission: ROLE_OWNER
     *
     * Request:  { "enabled": true | false }
     * Response: 204 No Content
     */
    @PatchMapping("/modules/{moduleCode}")
    public ResponseEntity<Void> toggle(
            @PathVariable String moduleCode,
            @RequestBody ModuleToggleRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        if (request == null || request.enabled() == null) {
            throw new com.mems.exception.AppException(
                com.mems.exception.ErrorCode.VALIDATION_ERROR, "'enabled' field is required");
        }

        String orgId = extractOrgId(jwt);
        String actorId = jwt.getSubject();
        moduleService.ownerToggle(orgId, moduleCode, request.isEnabled(), actorId);
        return ResponseEntity.noContent().build();
    }

    // orgId is a JWT claim, never accepted from path or query params.
    private String extractOrgId(Jwt jwt) {
        String orgId = jwt.getClaimAsString("orgId");
        if (orgId == null || orgId.isBlank()) {
            throw new com.mems.exception.AppException(
                com.mems.exception.ErrorCode.ORGANIZATION_REQUIRED,
                "No organization associated with this account");
        }
        return orgId;
    }
}
