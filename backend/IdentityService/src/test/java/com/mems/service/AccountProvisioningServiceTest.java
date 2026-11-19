package com.mems.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountProvisioningServiceTest {

    @Mock
    private JdbcTemplate jdbc;

    @Mock
    private PasswordEncoder encoder;

    private AccountProvisioningService service;

    @BeforeEach
    void setUp() {
        service = new AccountProvisioningService(jdbc, encoder);
    }

    @Test
    @DisplayName("disable: khóa tài khoản theo id và org")
    void disableLocksAccount() {
        service.disable("user-1", "org-1");

        verify(jdbc).update("UPDATE account SET status='disabled' WHERE id=? AND org_id=?",
            "user-1", "org-1");
        verify(jdbc).update(eq("UPDATE refresh_token SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL"),
            any(), eq("user-1"));
    }

    @Test
    @DisplayName("resetPassword: đặt lại mật khẩu và thu hồi phiên cũ")
    void resetPasswordRevokesSessions() {
        when(encoder.encode(anyString())).thenReturn("hash");
        when(jdbc.update(contains("UPDATE account SET password_hash"), anyString(), anyString(), anyString()))
            .thenReturn(1);

        service.resetPassword("user-1", "org-1");

        verify(jdbc).update(startsWith("UPDATE refresh_token SET revoked_at"), any(), eq("user-1"));
    }

    @Test
    @DisplayName("enable: mở lại tài khoản theo id và org (idempotent)")
    void enableActivatesAccount() {
        service.enable("user-1", "org-1");

        verify(jdbc).update("UPDATE account SET status='active' WHERE id=? AND org_id=?",
            "user-1", "org-1");
    }
}
