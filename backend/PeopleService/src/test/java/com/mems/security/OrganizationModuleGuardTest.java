package com.mems.security;

import com.mems.client.IdentityClient;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * Unit tests for OrganizationModuleGuard read/write split (BE-00.2 §3.3, DEC-11).
 *
 *  T-01  requireModuleForWrite passes when module is 'active'
 *  T-02  requireModuleForWrite throws when module is 'disabled'
 *  T-03  requireModuleForWrite throws when module is 'locked'
 *  T-04  requireModuleReadable passes when module is 'active'
 *  T-05  requireModuleReadable passes when module is 'disabled' (read-only mode)
 *  T-06  requireModuleReadable passes when module is 'locked'
 *  T-07  requireModuleReadable throws when module is not_registered
 *  T-08  Error message distinguishes 'disabled' from 'locked'
 *  T-09  Legacy requireModule delegates to write guard
 */
class OrganizationModuleGuardTest {

    private IdentityClient identityClient;
    private OrganizationModuleGuard guard;

    private static final String ORG_ID = "org-001";
    private static final String MODULE = "FACILITY_MANAGEMENT";

    @BeforeEach
    void setUp() {
        identityClient = mock(IdentityClient.class);
        guard = new OrganizationModuleGuard(identityClient);
    }

    @Test
    @DisplayName("T-01: requireModuleForWrite passes when module is 'active'")
    void writeGuardPassesWhenActive() {
        when(identityClient.activeModules(ORG_ID)).thenReturn(List.of(MODULE));

        // Should not throw
        guard.requireModuleForWrite(ORG_ID, MODULE);
    }

    @Test
    @DisplayName("T-02: requireModuleForWrite throws MODULE_NOT_ENABLED when module is 'disabled'")
    void writeGuardThrowsWhenDisabled() {
        when(identityClient.activeModules(ORG_ID)).thenReturn(List.of());
        when(identityClient.moduleStatus(ORG_ID)).thenReturn(List.of(
            Map.of("code", MODULE, "status", "disabled", "is_core", false)));

        assertThatThrownBy(() -> guard.requireModuleForWrite(ORG_ID, MODULE))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> {
                AppException appEx = (AppException) ex;
                assertThat(appEx.getErrorCode()).isEqualTo(ErrorCode.MODULE_NOT_ENABLED);
                assertThat(appEx.getMessage()).contains("read-only");
            });
    }

    @Test
    @DisplayName("T-03: requireModuleForWrite throws when module is 'locked'")
    void writeGuardThrowsWhenLocked() {
        when(identityClient.activeModules(ORG_ID)).thenReturn(List.of());
        when(identityClient.moduleStatus(ORG_ID)).thenReturn(List.of(
            Map.of("code", MODULE, "status", "locked", "is_core", false)));

        assertThatThrownBy(() -> guard.requireModuleForWrite(ORG_ID, MODULE))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> {
                AppException appEx = (AppException) ex;
                assertThat(appEx.getErrorCode()).isEqualTo(ErrorCode.MODULE_NOT_ENABLED);
                assertThat(appEx.getMessage()).contains("locked by a system administrator");
            });
    }

    @Test
    @DisplayName("T-04: requireModuleReadable passes when module is 'active'")
    void readGuardPassesWhenActive() {
        when(identityClient.moduleStatus(ORG_ID)).thenReturn(List.of(
            Map.of("code", MODULE, "status", "active")));

        guard.requireModuleReadable(ORG_ID, MODULE);
    }

    @Test
    @DisplayName("T-05: requireModuleReadable passes when module is 'disabled' (data preserved DEC-11)")
    void readGuardPassesWhenDisabled() {
        when(identityClient.moduleStatus(ORG_ID)).thenReturn(List.of(
            Map.of("code", MODULE, "status", "disabled")));

        // Should NOT throw — read-only mode allows reads
        guard.requireModuleReadable(ORG_ID, MODULE);
    }

    @Test
    @DisplayName("T-06: requireModuleReadable passes when module is 'locked'")
    void readGuardPassesWhenLocked() {
        when(identityClient.moduleStatus(ORG_ID)).thenReturn(List.of(
            Map.of("code", MODULE, "status", "locked")));

        guard.requireModuleReadable(ORG_ID, MODULE);
    }

    @Test
    @DisplayName("T-07: requireModuleReadable throws when module is not registered for the org")
    void readGuardThrowsWhenNotRegistered() {
        when(identityClient.moduleStatus(ORG_ID)).thenReturn(List.of(
            Map.of("code", MODULE, "status", "not_registered")));

        assertThatThrownBy(() -> guard.requireModuleReadable(ORG_ID, MODULE))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.MODULE_NOT_ENABLED));
    }

    @Test
    @DisplayName("T-08: Error message distinguishes 'disabled' from 'locked'")
    void errorMessageDiffersByState() {
        when(identityClient.activeModules(ORG_ID)).thenReturn(List.of());

        when(identityClient.moduleStatus(ORG_ID)).thenReturn(List.of(
            Map.of("code", MODULE, "status", "disabled")));
        AppException disabledEx = catchAppException(() -> guard.requireModuleForWrite(ORG_ID, MODULE));
        assertThat(disabledEx.getMessage()).contains("read-only");

        when(identityClient.moduleStatus(ORG_ID)).thenReturn(List.of(
            Map.of("code", MODULE, "status", "locked")));
        AppException lockedEx = catchAppException(() -> guard.requireModuleForWrite(ORG_ID, MODULE));
        assertThat(lockedEx.getMessage()).contains("locked by a system administrator");

        assertThat(disabledEx.getMessage()).isNotEqualTo(lockedEx.getMessage());
    }

    @Test
    @DisplayName("T-09: Legacy requireModule delegates to write guard")
    void legacyRequireModuleDelegatesToWriteGuard() {
        when(identityClient.activeModules(ORG_ID)).thenReturn(List.of());
        when(identityClient.moduleStatus(ORG_ID)).thenReturn(List.of(
            Map.of("code", MODULE, "status", "disabled")));

        // requireModule is the legacy alias — must still block writes
        assertThatThrownBy(() -> guard.requireModule(ORG_ID, MODULE))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.MODULE_NOT_ENABLED));
    }

    // Helper to capture AppException without AssertJ's assertThatThrownBy verbose lambda
    private AppException catchAppException(Runnable action) {
        try {
            action.run();
            throw new AssertionError("Expected AppException but nothing was thrown");
        } catch (AppException ex) {
            return ex;
        }
    }
}
