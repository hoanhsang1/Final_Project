package com.mems.service;

import com.mems.client.PeopleModuleClient;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Business logic for OWNER module toggle and SUPER_ADMIN module lock/unlock (DEC-01, DEC-11, BE-00.2).
 *
 * <p>Status lifecycle:</p>
 * <ul>
 *   <li>{@code active} — enabled for the organization.</li>
 *   <li>{@code disabled} — Owner turned it off (read-only mode per DEC-11).</li>
 *   <li>{@code locked} — SUPER_ADMIN locked it; Owner cannot change state.</li>
 * </ul>
 *
 * <p>Core modules (is_core = TRUE) cannot be disabled by anyone.</p>
 */
@Service
public class OrganizationModuleService {

    private static final Logger log = LoggerFactory.getLogger(OrganizationModuleService.class);

    private final JdbcTemplate jdbc;
    private final OrganizationApprovalService approvalService;
    private final PeopleModuleClient peopleModuleClient;

    public OrganizationModuleService(JdbcTemplate jdbc, OrganizationApprovalService approvalService,
                                     PeopleModuleClient peopleModuleClient) {
        this.jdbc = jdbc;
        this.approvalService = approvalService;
        this.peopleModuleClient = peopleModuleClient;
    }

    // ------------------------------------------------------------------ owner

    /**
     * OWNER: toggle an Optional module on or off for their own organization.
     * orgId must come from JWT — never from client input.
     */
    @Transactional
    public void ownerToggle(String orgId, String moduleCode, boolean enable, String actorId) {
        requireActiveOrg(orgId);
        ModuleRow module = requireModule(moduleCode);

        if (module.isCore()) {
            throw new AppException(ErrorCode.MODULE_IS_CORE);
        }

        ModuleOrgRow current = getOrCreateOrgModule(orgId, module.code());

        if ("locked".equals(current.status())) {
            throw new AppException(ErrorCode.MODULE_LOCKED_BY_ADMIN);
        }

        String targetStatus = enable ? "active" : "disabled";
        if (targetStatus.equals(current.status())) {
            throw new AppException(ErrorCode.MODULE_ALREADY_IN_STATE,
                "Module is already " + targetStatus);
        }

        if (!enable) {
            checkNoPendingWorkflows(orgId, module.code());
        }

        String oldStatus = current.status();
        jdbc.update("""
            UPDATE organization_module
            SET status = ?, disabled_at = ?
            WHERE org_id = ? AND module_code = ?
            """,
            targetStatus,
            enable ? null : Timestamp.from(Instant.now()),
            orgId, module.code());

        audit(orgId, actorId, enable ? "MODULE_ENABLED" : "MODULE_DISABLED",
            "ORGANIZATION_MODULE", orgId + ":" + module.code(),
            Map.of("module", module.code(), "oldStatus", oldStatus),
            Map.of("module", module.code(), "newStatus", targetStatus));
    }

    // ------------------------------------------------------------ super admin

    /**
     * SUPER_ADMIN: lock or unlock a module for a specific organization.
     * Locking prevents the Owner from changing the module state.
     * A non-blank reason is mandatory.
     */
    @Transactional
    public void adminLockToggle(String orgId, String moduleCode, boolean lock,
                                String reason, String adminId) {
        if (reason == null || reason.isBlank()) {
            throw new AppException(ErrorCode.MODULE_LOCK_REASON_REQUIRED);
        }
        requireActiveOrg(orgId);
        ModuleRow module = requireModule(moduleCode);

        if (module.isCore()) {
            throw new AppException(ErrorCode.MODULE_IS_CORE,
                "Core modules cannot be locked — they are always active");
        }

        ModuleOrgRow current = getOrCreateOrgModule(orgId, module.code());

        String targetStatus = lock ? "locked" : "active";
        if (targetStatus.equals(current.status())) {
            throw new AppException(ErrorCode.MODULE_ALREADY_IN_STATE,
                "Module is already " + targetStatus);
        }

        String oldStatus = current.status();
        if (lock) {
            jdbc.update("""
                UPDATE organization_module
                SET status = 'locked', locked_by_admin = ?, locked_reason = ?, locked_at = ?
                WHERE org_id = ? AND module_code = ?
                """,
                adminId, reason.trim(), Timestamp.from(Instant.now()), orgId, moduleCode);
        } else {
            jdbc.update("""
                UPDATE organization_module
                SET status = 'active', locked_by_admin = NULL, locked_reason = NULL, locked_at = NULL
                WHERE org_id = ? AND module_code = ?
                """,
                orgId, moduleCode);
        }

        audit(orgId, adminId, lock ? "MODULE_LOCKED_BY_ADMIN" : "MODULE_UNLOCKED_BY_ADMIN",
            "ORGANIZATION_MODULE", orgId + ":" + moduleCode,
            Map.of("module", moduleCode, "oldStatus", oldStatus, "reason", reason),
            Map.of("module", moduleCode, "newStatus", targetStatus));
    }

    /** Returns module status details visible to SUPER_ADMIN. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listForAdmin(String orgId) {
        requireActiveOrg(orgId);
        return jdbc.queryForList("""
            SELECT m.code, m.name, m.is_core,
                   COALESCE(om.status, 'not_registered') AS status,
                   om.locked_by_admin, om.locked_reason, om.locked_at, om.disabled_at
            FROM module m
            LEFT JOIN organization_module om ON om.module_code = m.code AND om.org_id = ?
            WHERE m.is_active = TRUE
            ORDER BY m.is_core DESC, m.code
            """, orgId);
    }

    /** Returns module status visible to the organization owner. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listForOwner(String orgId) {
        requireActiveOrg(orgId);
        return jdbc.queryForList("""
            SELECT m.code, m.name, m.is_core,
                   COALESCE(om.status, 'not_registered') AS status,
                   CASE WHEN om.status = 'locked' THEN TRUE ELSE FALSE END AS is_locked_by_admin
            FROM module m
            LEFT JOIN organization_module om ON om.module_code = m.code AND om.org_id = ?
            WHERE m.is_active = TRUE
            ORDER BY m.is_core DESC, m.code
            """, orgId);
    }

    // ---------------------------------------------------------------- helpers

    /**
     * Checks whether pending workflows would be broken by disabling this module.
     * Calls PeopleService via internal HTTP API (fail-closed: any exception blocks the disable).
     *
     * <p>Module mapping (kế hoạch v2 §0.2):
     * <ul>
     *   <li>STUDENT_MANAGEMENT — class close/cancel requests pending</li>
     *   <li>FACILITY_MANAGEMENT — transfer requests pending</li>
     *   <li>SCHEDULE_MANAGEMENT — no dedicated approval workflow yet; allowed</li>
     *   <li>Others — not yet tracked; allowed</li>
     * </ul>
     * </p>
     */
    private void checkNoPendingWorkflows(String orgId, String moduleCode) {
        // Only modules whose pending workflows are tracked in PeopleService need a cross-service call.
        if (!"STUDENT_MANAGEMENT".equals(moduleCode) && !"FACILITY_MANAGEMENT".equals(moduleCode)) {
            return;
        }
        try {
            int pending = peopleModuleClient.pendingWorkflowCount(orgId, moduleCode);
            if (pending > 0) {
                throw new AppException(ErrorCode.MODULE_PENDING_WORKFLOWS,
                    "Cannot disable module: " + pending + " pending workflow(s)");
            }
        } catch (AppException appEx) {
            // Re-throw application exceptions as-is (e.g. MODULE_PENDING_WORKFLOWS from above).
            throw appEx;
        } catch (Exception ex) {
            // Fail-closed: PeopleService unavailable → block the disable.
            log.warn("PeopleService unavailable when checking pending workflows for module={} org={}: {}",
                moduleCode, orgId, ex.toString());
            throw new AppException(ErrorCode.MODULE_PENDING_WORKFLOWS,
                "Cannot disable module: pending workflow status is unknown (service unavailable)");
        }
    }

    private void requireActiveOrg(String orgId) {
        List<String> statuses = jdbc.queryForList(
            "SELECT status FROM organization WHERE id = ?", String.class, orgId);
        if (statuses.isEmpty()) {
            throw new AppException(ErrorCode.ORGANIZATION_NOT_FOUND);
        }
        if (!"active".equals(statuses.get(0))) {
            throw new AppException(ErrorCode.ORGANIZATION_INACTIVE);
        }
    }

    private ModuleRow requireModule(String moduleCode) {
        if (moduleCode == null || moduleCode.isBlank()) {
            throw new AppException(ErrorCode.INVALID_MODULE, "Module code is required");
        }
        // Resolve legacy codes (Q-03)
        List<String> canonical = jdbc.queryForList(
            "SELECT canonical_code FROM module_legacy_map WHERE legacy_code = ?",
            String.class, moduleCode);
        String resolvedCode = canonical.isEmpty() ? moduleCode : canonical.get(0);

        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT code, name, is_active, is_core FROM module WHERE code = ?", resolvedCode);
        if (rows.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_MODULE, "Module not found: " + resolvedCode);
        }
        Map<String, Object> row = rows.get(0);
        if (!Boolean.TRUE.equals(row.get("is_active"))) {
            throw new AppException(ErrorCode.INVALID_MODULE, "Module is inactive: " + resolvedCode);
        }
        return new ModuleRow(resolvedCode, (String) row.get("name"),
            Boolean.TRUE.equals(row.get("is_core")));
    }

    private ModuleOrgRow getOrCreateOrgModule(String orgId, String moduleCode) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT status, locked_by_admin FROM organization_module WHERE org_id = ? AND module_code = ? FOR UPDATE",
            orgId, moduleCode);
        if (!rows.isEmpty()) {
            return new ModuleOrgRow(
                (String) rows.get(0).get("status"),
                (String) rows.get(0).get("locked_by_admin"));
        }
        // Module not yet registered for this org — create as 'active' baseline.
        jdbc.update(
            "INSERT INTO organization_module (org_id, module_code, status) VALUES (?, ?, 'active')",
            orgId, moduleCode);
        return new ModuleOrgRow("active", null);
    }

    private void audit(String orgId, String actorId, String action, String entityType,
                       String entityId, Map<String, ?> oldValue, Map<String, ?> newValue) {
        try {
            jdbc.update("""
                INSERT INTO audit_log (id, org_id, actor_account_id, action, entity_type, entity_id,
                                       old_value, new_value, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))
                """,
                UUID.randomUUID().toString(), orgId, actorId, action, entityType, entityId,
                toJson(oldValue), toJson(newValue));
        } catch (Exception ignored) {
            // Audit failure must never break the primary operation.
        }
    }

    private String toJson(Map<String, ?> map) {
        if (map == null || map.isEmpty()) return null;
        StringBuilder sb = new StringBuilder("{");
        map.forEach((k, v) -> {
            if (sb.length() > 1) sb.append(",");
            sb.append("\"").append(k).append("\":\"").append(v).append("\"");
        });
        sb.append("}");
        return sb.toString();
    }

    private record ModuleRow(String code, String name, boolean isCore) {}
    private record ModuleOrgRow(String status, String lockedByAdmin) {}
}
