package com.mems.controller;

import com.mems.dto.ModuleLockRequest;
import com.mems.service.OrganizationModuleService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * SUPER_ADMIN API: view module state and lock/unlock modules for any organization (BE-00.2 §3.2).
 *
 * <p>Protected by the existing {@code /api/v1/organizations/**} → {@code ROLE_SUPER_ADMIN}
 * matcher in SecurityConfig. No additional annotation needed here — the SecurityConfig
 * pattern already covers this path.</p>
 */
@RestController
@RequestMapping("/api/v1/organizations/{orgId}/modules")
public class AdminModuleController {

    private final OrganizationModuleService moduleService;

    public AdminModuleController(OrganizationModuleService moduleService) {
        this.moduleService = moduleService;
    }

    /**
     * GET /api/v1/organizations/{orgId}/modules/admin
     * Returns full module state including lock details.
     * Permission: ROLE_SUPER_ADMIN (via SecurityConfig pattern)
     */
    @GetMapping("/admin")
    public ResponseEntity<List<Map<String, Object>>> listForAdmin(
            @PathVariable String orgId) {
        return ResponseEntity.ok(moduleService.listForAdmin(orgId));
    }

    /**
     * PATCH /api/v1/organizations/{orgId}/modules/{moduleCode}/lock
     * SUPER_ADMIN locks or unlocks a module for the specified organization.
     * A non-blank reason is mandatory.
     * Permission: ROLE_SUPER_ADMIN (via SecurityConfig pattern)
     *
     * Request:  { "lock": true | false, "reason": "..." }
     * Response: 204 No Content
     */
    @PatchMapping("/{moduleCode}/lock")
    public ResponseEntity<Void> lockToggle(
            @PathVariable String orgId,
            @PathVariable String moduleCode,
            @RequestBody ModuleLockRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        if (request == null || request.lock() == null) {
            throw new com.mems.exception.AppException(
                com.mems.exception.ErrorCode.VALIDATION_ERROR, "'lock' field is required");
        }
        String adminId = jwt.getSubject();
        moduleService.adminLockToggle(orgId, moduleCode, request.isLock(), request.reason(), adminId);
        return ResponseEntity.noContent().build();
    }
}
