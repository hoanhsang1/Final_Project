package com.mems.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Internal endpoint used by IdentityService to check whether pending workflows
 * block disabling a module (kế hoạch v2 §0.2, fail-closed rule).
 *
 * <p>Protected by {@code InternalApiFilter} (X-Internal-Api-Key header required).
 * Always returns {@code { "pendingCount": N }} — N > 0 means disable is blocked.</p>
 *
 * <p>Module mapping (confirmed against schema):
 * <ul>
 *   <li>{@code STUDENT_MANAGEMENT} — {@code school_class} rows with
 *       {@code close_state='PENDING'} OR {@code cancel_state='PENDING'}.
 *       These are close/cancel approval requests pending a head-of-department decision.</li>
 *   <li>{@code FACILITY_MANAGEMENT} — NEEDS_DECISION (see below). Returns 0 for now
 *       but the caller (OrganizationModuleService) handles this conservatively.</li>
 *   <li>All others — always 0 (no pending workflow structure defined yet)</li>
 * </ul>
 * </p>
 *
 * <p><strong>NEEDS_DECISION — FACILITY_MANAGEMENT:</strong><br>
 * Transfer requests ({@code transfer_request}) belong to HR workflows (employee
 * department transfers), NOT to the FACILITY_MANAGEMENT module. Facility issues
 * ({@code incident_report}) live in {@code mems_facility_db} which PeopleService
 * cannot query. No pending workflow structure owned by PeopleService is currently
 * tied to FACILITY_MANAGEMENT. Per hotfix instructions this returns 0 until a
 * Product Owner decision defines the correct mapping.
 * See: docs/BE-00.2-00.3-hotfix-report.md § Issue-5.</p>
 *
 * <p><strong>NOTE — STUDENT_MANAGEMENT is a Core module:</strong><br>
 * Core modules cannot be disabled at all (blocked by {@code MODULE_IS_CORE} before
 * this check is ever reached). This endpoint still returns the correct count for
 * correctness and future use if the Core/Optional classification changes.</p>
 */
@RestController
@RequestMapping("/internal/modules")
public class InternalModulePendingController {

    private final JdbcTemplate jdbc;

    public InternalModulePendingController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/{moduleCode}/pending-count")
    @Transactional(readOnly = true)
    public Map<String, Integer> pendingCount(@PathVariable String moduleCode,
                                             @RequestParam String orgId) {
        int count = switch (moduleCode) {
            case "STUDENT_MANAGEMENT" -> countStudentManagementPending(orgId);
            // FACILITY_MANAGEMENT: NEEDS_DECISION — no confirmed pending workflow
            // in mems_people_db tied to this module. Returns 0 until spec clarified.
            // Transfer requests (transfer_request) are HR/people workflows, not facility.
            // Facility incident_report lives in mems_facility_db (not accessible here).
            case "FACILITY_MANAGEMENT" -> 0;
            default -> 0;
        };
        return Map.of("pendingCount", count);
    }

    /**
     * Counts classes with a pending approval request (close or cancel).
     * Schema: table {@code school_class}, states {@code close_state='PENDING'}
     * and {@code cancel_state='PENDING'} (confirmed from ClassStatusRepository).
     */
    private int countStudentManagementPending(String orgId) {
        Integer result = jdbc.queryForObject("""
            SELECT COUNT(*) FROM school_class
            WHERE org_id = ?
              AND deleted_at IS NULL
              AND (close_state = 'PENDING' OR cancel_state = 'PENDING')
            """, Integer.class, orgId);
        return result == null ? 0 : result;
    }
}
