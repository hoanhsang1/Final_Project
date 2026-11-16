package com.mems.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.Set;
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
    private static final String NOT_REGISTERED = "not_registered";

    /**
     * Modules whose pending work is an approval workflow owned by PeopleService.
     * Facility work (incident reports) is not an approval queue, and transfers are
     * an HR/People workflow that must never be counted against FACILITY_MANAGEMENT.
     */
    private static final Set<String> PENDING_WORKFLOW_MODULES = Set.of("STUDENT_MANAGEMENT");

    private final JdbcTemplate jdbc;
    private final OrganizationApprovalService approvalService;
    private final PeopleModuleClient peopleModuleClient;
    private final ObjectMapper json;

    public OrganizationModuleService(JdbcTemplate jdbc, OrganizationApprovalService approvalService,
                                     PeopleModuleClient peopleModuleClient, ObjectMapper json) {
        this.jdbc = jdbc;
        this.approvalService = approvalService;
        this.peopleModuleClient = peopleModuleClient;
        this.json = json;
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

        ModuleOrgRow current = findOrgModule(orgId, module.code());
        String currentStatus = current == null ? NOT_REGISTERED : current.status();

        if ("locked".equals(currentStatus)) {
            throw new AppException(ErrorCode.MODULE_LOCKED_BY_ADMIN);
        }

        String targetStatus = enable ? "active" : "disabled";
        if (targetStatus.equals(currentStatus)) {
            throw new AppException(ErrorCode.MODULE_ALREADY_IN_STATE,
                "Module is already " + targetStatus);
        }
        if (!enable && !"active".equals(currentStatus)) {
            // requested/rejected/not_registered modules are not enabled, so there is
            // nothing to disable. Never invent an "active" row just to turn it off.
            throw new AppException(ErrorCode.MODULE_ALREADY_IN_STATE,
                "Module is not enabled for this organization");
        }

        if (!enable) {
            checkNoPendingWorkflows(orgId, module.code());
        }

        String oldStatus = currentStatus;
        if (current == null) {
            jdbc.update("""
                INSERT INTO organization_module (org_id, module_code, status, disabled_at)
                VALUES (?, ?, ?, ?)
                """,
                orgId, module.code(), targetStatus,
                enable ? null : Timestamp.from(Instant.now()));
        } else {
            jdbc.update("""
                UPDATE organization_module
                SET status = ?, disabled_at = ?, status_before_lock = NULL
                WHERE org_id = ? AND module_code = ?
                """,
                targetStatus,
                enable ? null : Timestamp.from(Instant.now()),
                orgId, module.code());
        }

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

        ModuleOrgRow current = findOrgModule(orgId, module.code());
        String currentStatus = current == null ? NOT_REGISTERED : current.status();

        String oldStatus = currentStatus;
        if (lock) {
            if ("locked".equals(currentStatus)) {
                throw new AppException(ErrorCode.MODULE_ALREADY_IN_STATE,
                    "Module is already locked");
            }
            // Remember the effective pre-lock state so unlock never silently turns on a
            // module the Owner had disabled. An unregistered module restores as disabled.
            String priorStatus = current == null ? "disabled" : priorStatusForLock(currentStatus);
            if (current == null) {
                jdbc.update("""
                    INSERT INTO organization_module
                        (org_id, module_code, status, locked_by_admin, locked_reason, locked_at,
                         status_before_lock)
                    VALUES (?, ?, 'locked', ?, ?, ?, ?)
                    """,
                    orgId, module.code(), adminId, reason.trim(), Timestamp.from(Instant.now()),
                    priorStatus);
            } else {
                jdbc.update("""
                    UPDATE organization_module
                    SET status = 'locked', locked_by_admin = ?, locked_reason = ?, locked_at = ?,
                        status_before_lock = ?
                    WHERE org_id = ? AND module_code = ?
                    """,
                    adminId, reason.trim(), Timestamp.from(Instant.now()), priorStatus,
                    orgId, module.code());
            }
        } else {
            if (current == null || !"locked".equals(currentStatus)) {
                throw new AppException(ErrorCode.MODULE_ALREADY_IN_STATE,
                    "Module is not locked");
            }
            String restoreStatus = restoreStatus(current.statusBeforeLock());
            jdbc.update("""
                UPDATE organization_module
                SET status = ?, locked_by_admin = NULL, locked_reason = NULL, locked_at = NULL,
                    status_before_lock = NULL, disabled_at = ?
                WHERE org_id = ? AND module_code = ?
                """,
                restoreStatus,
                "disabled".equals(restoreStatus) ? Timestamp.from(Instant.now()) : null,
                orgId, module.code());
        }

        audit(orgId, adminId, lock ? "MODULE_LOCKED_BY_ADMIN" : "MODULE_UNLOCKED_BY_ADMIN",
            "ORGANIZATION_MODULE", orgId + ":" + module.code(),
            Map.of("module", module.code(), "oldStatus", oldStatus, "reason", reason.trim()),
            Map.of("module", module.code(),
                "newStatus", lock ? "locked" : restoreStatus(current.statusBeforeLock())));
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
     * <p>Mapping:
     * <ul>
     *   <li>STUDENT_MANAGEMENT — pending class close/cancel approvals (PeopleService)</li>
     *   <li>FACILITY_MANAGEMENT — no approval queue in scope. Incident reports are
     *       operational records, and transfers are an HR/People workflow: counting
     *       transfers here would block facility disable for an unrelated reason.</li>
     *   <li>Others — no tracked approval workflow; allowed.</li>
     * </ul>
     * </p>
     */
    private void checkNoPendingWorkflows(String orgId, String moduleCode) {
        // Only modules with an actual approval workflow need a cross-service call.
        if (!PENDING_WORKFLOW_MODULES.contains(moduleCode)) {
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

    private ModuleOrgRow findOrgModule(String orgId, String moduleCode) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
            SELECT status, locked_by_admin, status_before_lock
            FROM organization_module
            WHERE org_id = ? AND module_code = ?
            FOR UPDATE
            """, orgId, moduleCode);
        if (rows.isEmpty()) {
            return null;
        }
        Map<String, Object> row = rows.get(0);
        return new ModuleOrgRow(
            (String) row.get("status"),
            (String) row.get("locked_by_admin"),
            (String) row.get("status_before_lock"));
    }

    /** Status to restore when a lock is released; never automatically enable. */
    private String priorStatusForLock(String currentStatus) {
        return switch (currentStatus) {
            case "active", "disabled" -> currentStatus;
            case "requested", "rejected", NOT_REGISTERED -> "disabled";
            default -> "disabled";
        };
    }

    private String restoreStatus(String statusBeforeLock) {
        if ("active".equals(statusBeforeLock)) return "active";
        return "disabled";
    }

    private void audit(String orgId, String actorId, String action, String entityType,
                       String entityId, Map<String, ?> oldValue, Map<String, ?> newValue) {
        // No catch: the audit row and the state change share one transaction. If the
        // audit cannot be written, the business change must roll back rather than pass silently.
        jdbc.update("""
            INSERT INTO audit_log (id, org_id, actor_account_id, action, entity_type, entity_id,
                                   old_value, new_value, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))
            """,
            UUID.randomUUID().toString(), orgId, actorId, action, entityType, entityId,
            toJson(oldValue), toJson(newValue));
    }

    private String toJson(Map<String, ?> map) {
        if (map == null || map.isEmpty()) return null;
        try {
            return json.writeValueAsString(map);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Cannot serialize audit payload", ex);
        }
    }

    private record ModuleRow(String code, String name, boolean isCore) {}
    private record ModuleOrgRow(String status, String lockedByAdmin, String statusBeforeLock) {}
}
