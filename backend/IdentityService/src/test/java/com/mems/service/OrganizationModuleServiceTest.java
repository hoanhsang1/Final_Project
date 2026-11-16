package com.mems.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mems.client.PeopleModuleClient;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
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
 */
class OrganizationModuleServiceTest {

    private JdbcTemplate jdbc;
    private OrganizationApprovalService approvalService;
    private PeopleModuleClient peopleModuleClient;
    private OrganizationModuleService service;

    private static final String ORG_ID = "org-001";
    private static final String ACTOR_ID = "user-001";
    private static final String MODULE_FACILITY = "FACILITY_MANAGEMENT";
    private static final String MODULE_STUDENT = "STUDENT_MANAGEMENT";
    private static final String MODULE_SCHEDULE = "SCHEDULE_MANAGEMENT";

    @BeforeEach
    void setUp() {
        jdbc = mock(JdbcTemplate.class);
        approvalService = mock(OrganizationApprovalService.class);
        peopleModuleClient = mock(PeopleModuleClient.class);
        service = new OrganizationModuleService(jdbc, approvalService, peopleModuleClient,
            new ObjectMapper());

        stubOrg(ORG_ID, "active");
        when(peopleModuleClient.pendingWorkflowCount(any(), any())).thenReturn(0);
    }

    // ------------------------------------------------------------------ T-01

    @Test
    @DisplayName("T-01: Owner enables a disabled Optional module successfully")
    void ownerEnablesOptionalModule() {
        stubModule(MODULE_FACILITY, false);
        stubNoLegacyMap(MODULE_FACILITY);
        stubOrgModule(ORG_ID, MODULE_FACILITY, "disabled", null, null);
        stubUpdateAndAudit();

        service.ownerToggle(ORG_ID, MODULE_FACILITY, true, ACTOR_ID);

        verify(jdbc).update(contains("SET status = ?"),
            eq("active"), isNull(), eq(ORG_ID), eq(MODULE_FACILITY));
    }

    // ------------------------------------------------------------------ T-02

    @Test
    @DisplayName("T-02: Owner disables an active Optional module successfully")
    void ownerDisablesOptionalModule() {
        stubModule(MODULE_FACILITY, false);
        stubNoLegacyMap(MODULE_FACILITY);
        stubOrgModule(ORG_ID, MODULE_FACILITY, "active", null, null);
        stubUpdateAndAudit();

        service.ownerToggle(ORG_ID, MODULE_FACILITY, false, ACTOR_ID);

        verify(jdbc).update(contains("SET status = ?"),
            eq("disabled"), any(), eq(ORG_ID), eq(MODULE_FACILITY));
    }

    // ------------------------------------------------------------------ T-03

    @Test
    @DisplayName("T-03: Core module cannot be disabled by Owner")
    void coreModuleCannotBeDisabled() {
        stubModule(MODULE_SCHEDULE, true);
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
        stubOrgModule(ORG_ID, MODULE_FACILITY, "locked", "admin-001", "disabled");

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
        stubOrgModule(ORG_ID, MODULE_FACILITY, "active", null, null);

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
        stubOrgModule(ORG_ID, MODULE_FACILITY, "active", null, null);
        stubUpdateAndAudit();

        service.adminLockToggle(ORG_ID, MODULE_FACILITY, true, "Policy violation", "admin-001");

        verify(jdbc).update(contains("SET status = 'locked'"),
            eq("admin-001"), eq("Policy violation"), any(), eq("active"),
            eq(ORG_ID), eq(MODULE_FACILITY));
    }

    // ------------------------------------------------------------------ T-10

    @Test
    @DisplayName("T-10: SUPER_ADMIN unlocks a module back to its pre-lock state")
    void adminUnlocksModule() {
        stubModule(MODULE_FACILITY, false);
        stubNoLegacyMap(MODULE_FACILITY);
        stubOrgModule(ORG_ID, MODULE_FACILITY, "locked", "admin-001", "active");
        stubUpdateAndAudit();

        service.adminLockToggle(ORG_ID, MODULE_FACILITY, false, "Unlocking after review", "admin-001");

        verify(jdbc).update(contains("SET status = ?"), eq("active"), isNull(),
            eq(ORG_ID), eq(MODULE_FACILITY));
    }

    @Test
    @DisplayName("T-10b: Unlock never auto-enables a module the Owner had disabled")
    void adminUnlockRestoresDisabledState() {
        stubModule(MODULE_FACILITY, false);
        stubNoLegacyMap(MODULE_FACILITY);
        stubOrgModule(ORG_ID, MODULE_FACILITY, "locked", "admin-001", "disabled");
        stubUpdateAndAudit();

        service.adminLockToggle(ORG_ID, MODULE_FACILITY, false, "Review finished", "admin-001");

        verify(jdbc).update(contains("SET status = ?"), eq("disabled"), any(),
            eq(ORG_ID), eq(MODULE_FACILITY));
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
        when(jdbc.queryForList(contains("FROM module_legacy_map"), eq(String.class), eq("ROOM_MANAGEMENT")))
            .thenReturn(List.of("FACILITY_MANAGEMENT"));
        stubModule(MODULE_FACILITY, false);
        stubOrgModule(ORG_ID, MODULE_FACILITY, "disabled", null, null);
        stubUpdateAndAudit();

        service.ownerToggle(ORG_ID, "ROOM_MANAGEMENT", true, ACTOR_ID);

        verify(jdbc).update(contains("SET status = ?"),
            eq("active"), isNull(), eq(ORG_ID), eq(MODULE_FACILITY));
    }

    // ------------------------------------------------------------------ T-14

    @Test
    @DisplayName("T-14: Pending student workflows (count > 0) block module disable")
    void pendingWorkflowsBlockModuleDisable() {
        stubModule(MODULE_STUDENT, false);
        stubNoLegacyMap(MODULE_STUDENT);
        stubOrgModule(ORG_ID, MODULE_STUDENT, "active", null, null);
        when(peopleModuleClient.pendingWorkflowCount(ORG_ID, MODULE_STUDENT)).thenReturn(3);

        assertThatThrownBy(() -> service.ownerToggle(ORG_ID, MODULE_STUDENT, false, ACTOR_ID))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.MODULE_PENDING_WORKFLOWS));
    }

    // ------------------------------------------------------------------ T-15

    @Test
    @DisplayName("T-15: PeopleService unavailable → fail-closed → MODULE_PENDING_WORKFLOWS")
    void peopleServiceUnavailableFailsClosed() {
        stubModule(MODULE_STUDENT, false);
        stubNoLegacyMap(MODULE_STUDENT);
        stubOrgModule(ORG_ID, MODULE_STUDENT, "active", null, null);
        when(peopleModuleClient.pendingWorkflowCount(ORG_ID, MODULE_STUDENT))
            .thenThrow(new ResourceAccessException("Connection refused"));

        assertThatThrownBy(() -> service.ownerToggle(ORG_ID, MODULE_STUDENT, false, ACTOR_ID))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.MODULE_PENDING_WORKFLOWS));
    }

    // ------------------------------------------------------------------ T-16

    @Test
    @DisplayName("T-16: No pending workflows → module disable allowed")
    void noPendingWorkflowsAllowDisable() {
        stubModule(MODULE_STUDENT, false);
        stubNoLegacyMap(MODULE_STUDENT);
        stubOrgModule(ORG_ID, MODULE_STUDENT, "active", null, null);
        when(peopleModuleClient.pendingWorkflowCount(ORG_ID, MODULE_STUDENT)).thenReturn(0);
        stubUpdateAndAudit();

        service.ownerToggle(ORG_ID, MODULE_STUDENT, false, ACTOR_ID);

        verify(jdbc).update(contains("SET status = ?"),
            eq("disabled"), any(), eq(ORG_ID), eq(MODULE_STUDENT));
    }

    // ------------------------------------------------------------------ P0-A

    @Test
    @DisplayName("P0-A: Unregistered module is not silently created as active")
    void unregisteredModuleIsNotAutoActivated() {
        stubModule(MODULE_FACILITY, false);
        stubNoLegacyMap(MODULE_FACILITY);
        // No organization_module row exists.
        stubUpdateAndAudit();

        // Disabling a module that was never registered must fail instead of inserting 'active'.
        assertThatThrownBy(() -> service.ownerToggle(ORG_ID, MODULE_FACILITY, false, ACTOR_ID))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.MODULE_ALREADY_IN_STATE));

        verify(jdbc, never()).update(contains("INSERT INTO organization_module"),
            any(), any(), any(), any());
    }

    @Test
    @DisplayName("P0-A: Explicit enable of an unregistered module writes only the requested state")
    void explicitEnableOfUnregisteredModuleWritesRequestedState() {
        stubModule(MODULE_FACILITY, false);
        stubNoLegacyMap(MODULE_FACILITY);
        stubUpdateAndAudit();

        service.ownerToggle(ORG_ID, MODULE_FACILITY, true, ACTOR_ID);

        verify(jdbc).update(contains("INSERT INTO organization_module"),
            eq(ORG_ID), eq(MODULE_FACILITY), eq("active"), isNull());
    }

    // ------------------------------------------------------------------ P0-B

    @Test
    @DisplayName("P0-B: Audit failure aborts the operation instead of being swallowed")
    void auditFailureIsNotSwallowed() {
        stubModule(MODULE_FACILITY, false);
        stubNoLegacyMap(MODULE_FACILITY);
        stubOrgModule(ORG_ID, MODULE_FACILITY, "active", null, null);
        when(jdbc.update(contains("SET status = ?"), any(), any(), any(), any())).thenReturn(1);
        when(jdbc.update(contains("INSERT INTO audit_log"),
            any(), any(), any(), any(), any(), any(), any(), any()))
            .thenThrow(new IllegalStateException("audit table unavailable"));

        assertThatThrownBy(() -> service.ownerToggle(ORG_ID, MODULE_FACILITY, false, ACTOR_ID))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("audit table unavailable");
    }

    @Test
    @DisplayName("P0-B: Audit payload is JSON-escaped, not hand-concatenated")
    void auditPayloadIsValidJson() throws Exception {
        stubModule(MODULE_FACILITY, false);
        stubNoLegacyMap(MODULE_FACILITY);
        stubOrgModule(ORG_ID, MODULE_FACILITY, "active", null, null);
        stubUpdateAndAudit();

        service.ownerToggle(ORG_ID, MODULE_FACILITY, false, ACTOR_ID);

        ArgumentCaptor<Object[]> args = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc).update(contains("INSERT INTO audit_log"), args.capture());
        ObjectMapper mapper = new ObjectMapper();
        var oldValue = mapper.readTree((String) args.getValue()[6]);
        var newValue = mapper.readTree((String) args.getValue()[7]);
        assertThat(oldValue.get("module").asText()).isEqualTo(MODULE_FACILITY);
        assertThat(oldValue.get("oldStatus").asText()).isEqualTo("active");
        assertThat(newValue.get("module").asText()).isEqualTo(MODULE_FACILITY);
        assertThat(newValue.get("newStatus").asText()).isEqualTo("disabled");
    }

    // ------------------------------------------------------------------ P0-C

    @Test
    @DisplayName("P0-C: Locking an unregistered module records a non-active restore state")
    void lockingUnregisteredModuleRemembersDisabledState() {
        stubModule(MODULE_FACILITY, false);
        stubNoLegacyMap(MODULE_FACILITY);
        stubUpdateAndAudit();

        service.adminLockToggle(ORG_ID, MODULE_FACILITY, true, "Abuse", "admin-001");

        verify(jdbc).update(contains("INSERT INTO organization_module"),
            eq(ORG_ID), eq(MODULE_FACILITY), eq("admin-001"), eq("Abuse"), any(), eq("disabled"));
    }

    // ------------------------------------------------------------------ P0-D

    @Test
    @DisplayName("P0-D: Disabling Facility does not query PeopleService (no HR transfer conflation)")
    void facilityDisableDoesNotCallPeopleService() {
        stubModule(MODULE_FACILITY, false);
        stubNoLegacyMap(MODULE_FACILITY);
        stubOrgModule(ORG_ID, MODULE_FACILITY, "active", null, null);
        stubUpdateAndAudit();

        service.ownerToggle(ORG_ID, MODULE_FACILITY, false, ACTOR_ID);

        verifyNoInteractions(peopleModuleClient);
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

    private void stubOrgModule(String orgId, String moduleCode, String status,
                               String lockedBy, String statusBeforeLock) {
        when(jdbc.queryForList(
            contains("FROM organization_module"), eq(orgId), eq(moduleCode)))
            .thenReturn(List.of(Map.of(
                "status", status,
                "locked_by_admin", lockedBy == null ? "" : lockedBy,
                "status_before_lock", statusBeforeLock == null ? "" : statusBeforeLock)));
    }

    private void stubUpdateAndAudit() {
        when(jdbc.update(anyString(), (Object[]) any())).thenReturn(1);
    }
}
