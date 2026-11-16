package com.mems.service;

import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for the platform account create/reset contract.
 *
 * <p>Guarantees the one-time temporary password is returned once and that
 * {@code must_change_password} is forced on for both creation and reset.</p>
 */
class AccountServiceTest {

    private JdbcTemplate jdbc;
    private PasswordEncoder encoder;
    private AccountService service;

    private static final String ORG_ID = "org-001";
    private static final String EMAIL = "new.person@example.com";
    private static final String ROLE = "STAFF";

    @BeforeEach
    void setUp() {
        jdbc = mock(JdbcTemplate.class);
        encoder = mock(PasswordEncoder.class);
        when(encoder.encode(anyString())).thenAnswer(inv -> "ENC(" + inv.getArgument(0) + ")");
        service = new AccountService(jdbc, encoder);
    }

    // ---------------------------------------------------------------- create

    @Test
    @DisplayName("Create forces must_change_password and returns the temp password once")
    void createReturnsTemporaryPasswordAndForcesChange() {
        stubCreateLookups();
        when(jdbc.queryForList(contains("WHERE a.id = ?"), anyString()))
            .thenReturn(List.of(Map.of("id", "acct-1", "username", "new.person",
                "email", EMAIL, "role", ROLE, "status", "active")));

        Map<String, Object> created = service.createAccount(Map.of(
            "email", EMAIL, "role", ROLE, "organization_id", ORG_ID));

        ArgumentCaptor<String> password = ArgumentCaptor.forClass(String.class);
        verify(encoder).encode(password.capture());
        String temporaryPassword = password.getValue();

        assertThat(temporaryPassword).hasSizeGreaterThanOrEqualTo(8);
        assertThat(temporaryPassword).contains("A1!");
        assertThat(created.get("temporaryPassword")).isEqualTo(temporaryPassword);
        assertThat(created.get("id")).isEqualTo("acct-1");

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object[]> args = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc, atLeastOnce()).update(sql.capture(), args.capture());
        int insertIndex = -1;
        for (int i = 0; i < sql.getAllValues().size(); i++) {
            if (sql.getAllValues().get(i).contains("INSERT INTO account (")) {
                insertIndex = i;
            }
        }
        assertThat(insertIndex).isGreaterThanOrEqualTo(0);
        assertThat(sql.getAllValues().get(insertIndex))
            .contains("must_change_password")
            .contains("TRUE");
        assertThat(args.getAllValues().get(insertIndex)).hasSize(5);
    }

    @Test
    @DisplayName("Create rejects a duplicate email before inserting")
    void createRejectsDuplicateEmail() {
        when(jdbc.queryForObject(contains("COUNT(*) FROM account WHERE email"),
            eq(Integer.class), eq(EMAIL))).thenReturn(1);

        assertThatThrownBy(() -> service.createAccount(Map.of("email", EMAIL, "role", ROLE)))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.EMAIL_EXISTS));

        verify(jdbc, never()).update(startsWith("INSERT INTO account ("), (Object[]) any());
    }

    @Test
    @DisplayName("Create refuses the SUPER_ADMIN role")
    void createRejectsSuperAdminRole() {
        assertThatThrownBy(() -> service.createAccount(Map.of("email", EMAIL, "role", "SUPER_ADMIN")))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.ROLE_NOT_ASSIGNABLE));

        verifyNoInteractions(jdbc);
    }

    // ----------------------------------------------------------------- reset

    @Test
    @DisplayName("Reset without a password generates one and returns it once")
    void resetGeneratesTemporaryPassword() {
        stubExistingAccount();

        Map<String, String> result = service.resetPassword("acct-1", null);

        String temporaryPassword = result.get("temporaryPassword");
        assertThat(temporaryPassword).isNotNull();
        assertThat(temporaryPassword).hasSizeGreaterThanOrEqualTo(8);

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object[]> args = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc).update(sql.capture(), args.capture());
        assertThat(sql.getValue()).contains("must_change_password = TRUE");
        assertThat(args.getValue()).hasSize(2);
        assertThat(args.getValue()[1]).isEqualTo("acct-1");
    }

    @Test
    @DisplayName("Reset with an explicit password forces change and returns no temp password")
    void resetWithExplicitPasswordForcesChange() {
        stubExistingAccount();

        Map<String, String> result = service.resetPassword("acct-1", "ChosenPass123");

        assertThat(result).isEmpty();
        verify(encoder).encode("ChosenPass123");

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object[]> args = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc).update(sql.capture(), args.capture());
        assertThat(sql.getValue()).contains("must_change_password = TRUE");
        assertThat(args.getValue()).contains("acct-1");
    }

    @Test
    @DisplayName("Reset rejects a password shorter than 8 characters")
    void resetRejectsShortPassword() {
        stubExistingAccount();

        assertThatThrownBy(() -> service.resetPassword("acct-1", "short"))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.PASSWORD_TOO_SHORT));

        verify(jdbc, never()).update(contains("UPDATE account SET password_hash"), (Object[]) any());
    }

    @Test
    @DisplayName("Reset for an unknown account → ACCOUNT_NOT_FOUND")
    void resetUnknownAccount() {
        when(jdbc.queryForObject(contains("COUNT(*) FROM account WHERE id"),
            eq(Integer.class), eq("missing"))).thenReturn(0);

        assertThatThrownBy(() -> service.resetPassword("missing", null))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.ACCOUNT_NOT_FOUND));

        verify(jdbc, never()).update(contains("UPDATE account SET password_hash"), (Object[]) any());
    }

    // ----------------------------------------------------------------- stubs

    private void stubCreateLookups() {
        when(jdbc.queryForObject(contains("COUNT(*) FROM account WHERE email"),
            eq(Integer.class), eq(EMAIL))).thenReturn(0);
        when(jdbc.queryForObject(contains("COUNT(*) > 0 FROM account WHERE username"),
            eq(Boolean.class), anyString())).thenReturn(false);
        when(jdbc.queryForList(contains("SELECT id FROM role WHERE code"),
            eq(Long.class), eq(ROLE))).thenReturn(List.of(7L));
        when(jdbc.update(anyString(), (Object[]) any())).thenReturn(1);
    }

    private void stubExistingAccount() {
        when(jdbc.queryForObject(contains("COUNT(*) FROM account WHERE id"),
            eq(Integer.class), eq("acct-1"))).thenReturn(1);
        when(jdbc.update(anyString(), (Object[]) any())).thenReturn(1);
    }
}
