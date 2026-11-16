package com.mems.service;

import com.mems.client.PeopleModuleClient;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.client.ResourceAccessException;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for OrganizationModuleService (BE-00.2).
 *
 * <p>Tests use Mockito to stub JdbcTemplate. No database required.</p>
 *
 * Coverage:
 *  T-01  Owner enables Optional module (success)
 *  T-02  Owner disables Optional module (success)
 *  T-03  Core module cannot be disabled
 *  T-04  Locked module cannot be toggled by owner
 *  T-05  Module already in requested state → conflict
 *  T-06  Module not found → invalid module error
 *  T-07  Organization not found → org not found error
 *  T-08  Organization inactive → org inactive error
 *  T-09  SUPER_ADMIN locks module (success)
 *  T-10  SUPER_ADMIN unlocks module (success)
 *  T-11  SUPER_ADMIN lock without reason → error
 *  T-12  SUPER_ADMIN cannot lock a core module
 *  T-13  Legacy module code resolved via module_legacy_map
 *  T-14  Pending workflows block module disable
 *  T-15  PeopleService unavailable → fail-closed (throws MODULE_PENDING_WORKFLOWS)
 *  T-16  No pending workflows → allow disable
 */
class OrganizationModuleServiceTest {

    private JdbcTemplate jdbc;
    private OrganizationApprovalService approvalService;
    private PeopleModuleClient peopleModuleClient;
    private OrganizationModuleService service;

    private static final String ORG_ID = "org-001";
    private static final String ACTOR_ID = "user-001";
    private static final String MODULE_FACILITY = "FACILITY_MANAGEMENT";
    private static final String MODULE_SCHEDULE = "SCHEDULE_MANAGEMENT";

    @BeforeEach
    void setUp() {
        jdbc = mock(JdbcTemplate.class);
        approvalService = mock(OrganizationApprovalService.class);
        peopleModuleClient = mock(PeopleModuleClient.class);
        service = new OrganizationModuleService(jdbc, approvalService, peopleModuleClient);

        // Default: org is active
        stubOrg(ORG_ID, "active");
        // Default: no pending workflows
        when(peopleModuleClient.pendingWorkflowCount(any(), any())).thenReturn(0);
    }

    // ------------------------------------------------------------------ T-01

    @Test
    @DisplayName("T-01: Owner enables Optional module successfully")
    void ownerEnablesOptionalModule() {
        stubModule(MODULE_FACILITY, false /* not core */);
        stubNoLegacyMap(MODULE_FACILITY);
        stubOrgModule(ORG_ID, MODULE_FACILITY, "disabled", null);
        stubUpdateAndAudit();

        // Should complete without throwing
        service.ownerToggle(ORG_ID, MODULE_FACILITY, true, ACTOR_ID);

        verify(jdbc).update(contains("SET status = ?"),
            eq("active"), isNull(), eq(ORG_ID), eq(MODULE_FACILITY));
    }

    // ------------------------------------------------------------------ T-02

    @Test
    @DisplayName("T-02: Owner disables Optional module successfully")
    void ownerDisablesOptionalModule() {
        stubModule(MODULE_FACILITY, false);
        stubNoLegacyMap(MODULE_FACILITY);
        stubOrgModule(ORG_ID, MODULE_FACILITY, "active", null);
        stubUpdateAndAudit();

        service.ownerToggle(ORG_ID, MODULE_FACILITY, false, ACTOR_ID);

        verify(jdbc).update(contains("SET status = ?"),
            eq("disabled"), any(), eq(ORG_ID), eq(MODULE_FACILITY));
    }

    // ------------------------------------------------------------------ T-03

    @Test
    @DisplayName("T-03: Core module cannot be disabled by Owner")
    void coreModuleCannotBeDisabled() {
        stubModule(MODULE_SCHEDULE, true /* core */);
        stubNoLegacyMap(MODULE_SCHEDULE);

        assertThatThrownBy(() -> service.ownerToggle(ORG_ID, MODULE_SCHEDULE, false, ACTOR_ID))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.MODULE_IS_CORE));
    }

    // ------------------------------------------------------------------ T-04

    @Test
    @DisplayName("T-04: Owner cannot change state of a locked module")
    void ownerCannotToggleLockedModule() {
        stubModule(MODULE_FACILITY, false);
        stubNoLegacyMap(MODULE_FACILITY);
        stubOrgModule(ORG_ID, MODULE_FACILITY, "locked", "admin-001");

        assertThatThrownBy(() -> service.ownerToggle(ORG_ID, MODULE_FACILITY, true, ACTOR_ID))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.MODULE_LOCKED_BY_ADMIN));
    }

    // ------------------------------------------------------------------ T-05

    @Test
    @DisplayName("T-05: Toggle to same state → MODULE_ALREADY_IN_STATE")
    void toggleToSameStateIsRejected() {
        stubModule(MODULE_FACILITY, false);
        stubNoLegacyMap(MODULE_FACILITY);
        stubOrgModule(ORG_ID, MODULE_FACILITY, "active", null);

        assertThatThrownBy(() -> service.ownerToggle(ORG_ID, MODULE_FACILITY, true, ACTOR_ID))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.MODULE_ALREADY_IN_STATE));
    }

    // ------------------------------------------------------------------ T-06

    @Test
    @DisplayName("T-06: Unknown module code → INVALID_MODULE")
    void unknownModuleCodeIsRejected() {
        stubNoLegacyMap("UNKNOWN_MODULE");
        when(jdbc.queryForList(contains("FROM module WHERE code"), eq("UNKNOWN_MODULE")))
            .thenReturn(List.of());

        assertThatThrownBy(() -> service.ownerToggle(ORG_ID, "UNKNOWN_MODULE", true, ACTOR_ID))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_MODULE));
    }

    // ------------------------------------------------------------------ T-07

    @Test
    @DisplayName("T-07: Organization not found → ORGANIZATION_NOT_FOUND")
    void organizationNotFoundIsRejected() {
        when(jdbc.queryForList(contains("FROM organization WHERE id"), eq(String.class), eq(ORG_ID)))
            .thenReturn(List.of());

        assertThatThrownBy(() -> service.ownerToggle(ORG_ID, MODULE_FACILITY, true, ACTOR_ID))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.ORGANIZATION_NOT_FOUND));
    }

    // ------------------------------------------------------------------ T-08

    @Test
    @DisplayName("T-08: Inactive organization → ORGANIZATION_INACTIVE")
    void inactiveOrgIsRejected() {
        stubOrg(ORG_ID, "suspended");

        assertThatThrownBy(() -> service.ownerToggle(ORG_ID, MODULE_FACILITY, true, ACTOR_ID))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.ORGANIZATION_INACTIVE));
    }

    // ------------------------------------------------------------------ T-09

    @Test
    @DisplayName("T-09: SUPER_ADMIN locks Optional module with reason")
    void adminLocksModuleWithReason() {
        stubModule(MODULE_FACILITY, false);
        stubNoLegacyMap(MODULE_FACILITY);
        stubOrgModule(ORG_ID, MODULE_FACILITY, "active", null);
        stubUpdateAndAudit();

        service.adminLockToggle(ORG_ID, MODULE_FACILITY, true, "Policy violation", "admin-001");

        verify(jdbc).update(contains("SET status = 'locked'"),
            eq("admin-001"), eq("Policy violation"), any(), eq(ORG_ID), eq(MODULE_FACILITY));
    }

    // ------------------------------------------------------------------ T-10

    @Test
    @DisplayName("T-10: SUPER_ADMIN unlocks a locked module")
    void adminUnlocksModule() {
        stubModule(MODULE_FACILITY, false);
        stubNoLegacyMap(MODULE_FACILITY);
        stubOrgModule(ORG_ID, MODULE_FACILITY, "locked", "admin-001");
        stubUpdateAndAudit();

        service.adminLockToggle(ORG_ID, MODULE_FACILITY, false, "Unlocking after review", "admin-001");

        verify(jdbc).update(contains("SET status = 'active'"), eq(ORG_ID), eq(MODULE_FACILITY));
    }

    // ------------------------------------------------------------------ T-11

    @Test
    @DisplayName("T-11: Lock without reason → MODULE_LOCK_REASON_REQUIRED")
    void lockWithoutReasonIsRejected() {
        assertThatThrownBy(() ->
            service.adminLockToggle(ORG_ID, MODULE_FACILITY, true, null, "admin-001"))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.MODULE_LOCK_REASON_REQUIRED));

        assertThatThrownBy(() ->
            service.adminLockToggle(ORG_ID, MODULE_FACILITY, true, "  ", "admin-001"))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.MODULE_LOCK_REASON_REQUIRED));
    }

    // ------------------------------------------------------------------ T-12

    @Test
    @DisplayName("T-12: SUPER_ADMIN cannot lock a core module")
    void adminCannotLockCoreModule() {
        stubModule(MODULE_SCHEDULE, true);
        stubNoLegacyMap(MODULE_SCHEDULE);

        assertThatThrownBy(() ->
            service.adminLockToggle(ORG_ID, MODULE_SCHEDULE, true, "reason", "admin-001"))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.MODULE_IS_CORE));
    }

    // ------------------------------------------------------------------ T-13

    @Test
    @DisplayName("T-13: Legacy code ROOM_MANAGEMENT resolved to FACILITY_MANAGEMENT")
    void legacyCodeIsResolved() {
        // Legacy map returns canonical code
        when(jdbc.queryForList(contains("FROM module_legacy_map"), eq(String.class), eq("ROOM_MANAGEMENT")))
            .thenReturn(List.of("FACILITY_MANAGEMENT"));
        // Now the canonical module lookup proceeds
        stubModule(MODULE_FACILITY, false);
        stubOrgModule(ORG_ID, MODULE_FACILITY, "disabled", null);
        stubUpdateAndAudit();

        // Should NOT throw — legacy code is transparently resolved
        service.ownerToggle(ORG_ID, "ROOM_MANAGEMENT", true, ACTOR_ID);

        verify(jdbc).update(contains("SET status = ?"),
            eq("active"), isNull(), eq(ORG_ID), eq(MODULE_FACILITY));
    }

    // ------------------------------------------------------------------ T-14

    @Test
    @DisplayName("T-14: Pending workflows (count > 0) block module disable")
    void pendingWorkflowsBlockModuleDisable() {
        stubModule(MODULE_FACILITY, false);
        stubNoLegacyMap(MODULE_FACILITY);
        stubOrgModule(ORG_ID, MODULE_FACILITY, "active", null);
        when(peopleModuleClient.pendingWorkflowCount(ORG_ID, MODULE_FACILITY)).thenReturn(3);

        assertThatThrownBy(() -> service.ownerToggle(ORG_ID, MODULE_FACILITY, false, ACTOR_ID))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.MODULE_PENDING_WORKFLOWS));
    }

    // ------------------------------------------------------------------ T-15

    @Test
    @DisplayName("T-15: PeopleService unavailable → fail-closed → MODULE_PENDING_WORKFLOWS")
    void peopleServiceUnavailableFailsClosed() {
        stubModule(MODULE_FACILITY, false);
        stubNoLegacyMap(MODULE_FACILITY);
        stubOrgModule(ORG_ID, MODULE_FACILITY, "active", null);
        when(peopleModuleClient.pendingWorkflowCount(ORG_ID, MODULE_FACILITY))
            .thenThrow(new ResourceAccessException("Connection refused"));

        assertThatThrownBy(() -> service.ownerToggle(ORG_ID, MODULE_FACILITY, false, ACTOR_ID))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.MODULE_PENDING_WORKFLOWS));
    }

    // ------------------------------------------------------------------ T-16

    @Test
    @DisplayName("T-16: No pending workflows → module disable allowed")
    void noPendingWorkflowsAllowDisable() {
        stubModule(MODULE_FACILITY, false);
        stubNoLegacyMap(MODULE_FACILITY);
        stubOrgModule(ORG_ID, MODULE_FACILITY, "active", null);
        when(peopleModuleClient.pendingWorkflowCount(ORG_ID, MODULE_FACILITY)).thenReturn(0);
        stubUpdateAndAudit();

        // Should complete without throwing
        service.ownerToggle(ORG_ID, MODULE_FACILITY, false, ACTOR_ID);

        verify(jdbc).update(contains("SET status = ?"),
            eq("disabled"), any(), eq(ORG_ID), eq(MODULE_FACILITY));
    }

    // ------------------------------------------------------------------ stubs

    private void stubOrg(String orgId, String status) {
        when(jdbc.queryForList(contains("FROM organization WHERE id"), eq(String.class), eq(orgId)))
            .thenReturn(List.of(status));
    }

    private void stubModule(String code, boolean isCore) {
        when(jdbc.queryForList(anyString(), eq(code)))
            .thenReturn(List.of(Map.of("code", code, "name", code, "is_active", true, "is_core", isCore)));
    }

    private void stubNoLegacyMap(String code) {
        when(jdbc.queryForList(contains("FROM module_legacy_map"), eq(String.class), eq(code)))
            .thenReturn(List.of());
    }

    @SuppressWarnings("unchecked")
    private void stubOrgModule(String orgId, String moduleCode, String status, String lockedBy) {
        // Use anyString() for the SQL since the query contains FOR UPDATE
        when(jdbc.queryForList(
            anyString(), eq(orgId), eq(moduleCode)))
            .thenReturn(List.of(Map.of("status", status,
                "locked_by_admin", lockedBy == null ? "" : lockedBy)));
    }

    private void stubUpdateAndAudit() {
        when(jdbc.update(anyString(), (Object[]) any())).thenReturn(1);
    }
}
