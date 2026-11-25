package com.mems.security;

import com.mems.client.IdentityClient;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Guards module access per DEC-11 (BE-00.2):
 * <ul>
 *   <li>{@code requireModuleActive} — full access; throws if module is not 'active'.</li>
 *   <li>{@code requireModuleReadable} — read-only access; allows 'active' and 'disabled'/'locked'
 *       (data must still be viewable when module is off).</li>
 *   <li>{@code requireModuleForWrite} — write access; only 'active' passes.</li>
 * </ul>
 *
 * <p>The underlying {@code /internal/orgs/{orgId}/modules} endpoint returns ONLY 'active' codes.
 * To distinguish 'disabled' from 'not registered', we use the new
 * {@code /internal/orgs/{orgId}/modules/status} endpoint when needed.</p>
 */
@Component
public class OrganizationModuleGuard {

    private final IdentityClient identityClient;

    public OrganizationModuleGuard(IdentityClient identityClient) {
        this.identityClient = identityClient;
    }

    /**
     * Legacy method kept for backward compatibility.
     * Equivalent to {@link #requireModuleForWrite} — only 'active' passes.
     */
    public void requireModule(String orgId, String moduleCode) {
        requireModuleForWrite(orgId, moduleCode);
    }

    /**
     * Write guard: module must be 'active'.
     * Use this on POST/PUT/PATCH/DELETE endpoints that mutate data.
     */
    public void requireModuleForWrite(String orgId, String moduleCode) {
        List<String> activeModules = identityClient.activeModules(orgId);
        if (activeModules == null || !activeModules.contains(moduleCode)) {
            // Distinguish 'disabled'/'locked' from 'not registered'
            String detail = resolveDisabledDetail(orgId, moduleCode);
            throw new AppException(ErrorCode.MODULE_NOT_ENABLED, detail);
        }
    }

    /**
     * Read guard: module must exist and not be entirely unregistered.
     * 'active', 'disabled', and 'locked' all pass — data is preserved per DEC-11.
     * Only truly unknown/unregistered module codes are rejected.
     */
    public void requireModuleReadable(String orgId, String moduleCode) {
        List<Map<String, Object>> statuses = identityClient.moduleStatus(orgId);
        boolean known = statuses.stream()
            .anyMatch(row -> moduleCode.equals(row.get("code"))
                && !"not_registered".equals(row.get("status")));
        if (!known) {
            throw new AppException(ErrorCode.MODULE_NOT_ENABLED,
                "Module " + moduleCode + " is not registered for this organization");
        }
    }

    /** True if module is currently 'active' (full write access allowed). */
    public boolean isActive(String orgId, String moduleCode) {
        List<String> activeModules = identityClient.activeModules(orgId);
        return activeModules != null && activeModules.contains(moduleCode);
    }

    /** True if module is registered (active or disabled/locked — data exists). */
    public boolean isReadable(String orgId, String moduleCode) {
        try {
            List<Map<String, Object>> statuses = identityClient.moduleStatus(orgId);
            return statuses.stream()
                .anyMatch(row -> moduleCode.equals(row.get("code"))
                    && !"not_registered".equals(row.get("status")));
        } catch (AppException ex) {
            return false;
        }
    }

    // Returns a user-visible message based on the module's actual state.
    private String resolveDisabledDetail(String orgId, String moduleCode) {
        try {
            List<Map<String, Object>> statuses = identityClient.moduleStatus(orgId);
            for (Map<String, Object> row : statuses) {
                if (moduleCode.equals(row.get("code"))) {
                    String status = (String) row.get("status");
                    if ("locked".equals(status)) {
                        return "Module " + moduleCode + " has been locked by a system administrator";
                    }
                    if ("disabled".equals(status)) {
                        return "Module " + moduleCode + " is currently disabled (read-only mode)";
                    }
                    return "Module " + moduleCode + " is not active";
                }
            }
        } catch (Exception ignored) {
            // Fall through to generic message
        }
        return "Module " + moduleCode + " is not enabled for this organization";
    }
}
