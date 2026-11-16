package com.mems.controller;

import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
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
 *       {@code close_state='PENDING'} OR {@code cancel_state='PENDING'}.</li>
 *   <li>{@code FACILITY_MANAGEMENT} — no PeopleService approval queue. Facility
 *       incident reports live in {@code mems_facility_db}; transfers are an HR
 *       workflow and must not be counted here.</li>
 *   <li>Any other code — rejected instead of returning a misleading zero.</li>
 * </ul>
 * </p>
 *
 * <p><strong>NEEDS_DECISION — FACILITY_MANAGEMENT:</strong><br>
 * Transfer requests ({@code transfer_request}) belong to HR workflows (employee
 * department transfers), NOT to the FACILITY_MANAGEMENT module. Facility issues
 * ({@code incident_report}) live in {@code mems_facility_db} which PeopleService
 * cannot query. There is no approval queue in this service tied to
 * FACILITY_MANAGEMENT, so {@code OrganizationModuleService} does not call this
 * endpoint for that module. If the Product Owner later defines a facility
 * approval queue, add it here and restore the cross-service call.</p>
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
            case "FACILITY_MANAGEMENT" -> 0;
            default -> throw new AppException(ErrorCode.VALIDATION_ERROR,
                "No pending workflow mapping for module: " + moduleCode);
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
