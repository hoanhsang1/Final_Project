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
 * <p>Module mapping:
 * <ul>
 *   <li>{@code STUDENT_MANAGEMENT} — class rows with
 *       {@code close_state='CLOSE_REQUESTED'} OR {@code cancel_state='CANCEL_REQUESTED'}</li>
 *   <li>{@code FACILITY_MANAGEMENT} — transfer_request rows with {@code status='PENDING'}</li>
 *   <li>All others — always 0 (no pending workflow structure defined yet)</li>
 * </ul>
 * </p>
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
            case "FACILITY_MANAGEMENT" -> countFacilityManagementPending(orgId);
            default -> 0;
        };
        return Map.of("pendingCount", count);
    }

    private int countStudentManagementPending(String orgId) {
        Integer result = jdbc.queryForObject("""
            SELECT COUNT(*) FROM class
            WHERE org_id = ?
              AND deleted_at IS NULL
              AND (close_state = 'CLOSE_REQUESTED' OR cancel_state = 'CANCEL_REQUESTED')
            """, Integer.class, orgId);
        return result == null ? 0 : result;
    }

    private int countFacilityManagementPending(String orgId) {
        Integer result = jdbc.queryForObject("""
            SELECT COUNT(*) FROM transfer_request
            WHERE org_id = ?
              AND status = 'PENDING'
            """, Integer.class, orgId);
        return result == null ? 0 : result;
    }
}
