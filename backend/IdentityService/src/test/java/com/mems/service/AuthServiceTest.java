package com.mems.service;

import com.mems.dto.AccessProfile;
import com.mems.dto.LoginRequest;
import com.mems.dto.LoginResponse;
import com.mems.entity.Account;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.IAccountRepository;
import com.mems.repository.IOrganizationRepository;
import com.mems.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Regression tests for the removed platform-admin backdoor. The literal
 * {@code 123456} must never authenticate, even for legacy admin usernames.
 */
class AuthServiceTest {

    private static final String PASSWORD = "CorrectHorseBattery9!";

    private IAccountRepository accounts;
    private JwtService jwt;
    private RefreshTokenService refreshTokens;
    private AccessProfileService profiles;
    private AuthService service;
    private PasswordEncoder encoder;

    @BeforeEach
    void setUp() {
        accounts = mock(IAccountRepository.class);
        jwt = mock(JwtService.class);
        refreshTokens = mock(RefreshTokenService.class);
        profiles = mock(AccessProfileService.class);
        encoder = new BCryptPasswordEncoder();
        service = new AuthService(accounts, mock(IOrganizationRepository.class), encoder,
                jwt, refreshTokens, profiles, mock(LoginAttemptService.class));
    }

    @Test
    @DisplayName("123456 is rejected for platform_admin and admin")
    void backdoorPasswordIsRejected() throws Exception {
        for (String username : List.of("platform_admin", "admin")) {
            when(accounts.findByUsername(username)).thenReturn(Optional.of(account(username)));

            assertThatThrownBy(() -> service.login(new LoginRequest(username, "123456")))
                    .isInstanceOf(AppException.class)
                    .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                            .isEqualTo(ErrorCode.INVALID_CREDENTIALS));
        }
    }

    @Test
    @DisplayName("A correct password still authenticates a SUPER_ADMIN")
    void correctPasswordStillWorks() throws Exception {
        Account acc = account("platform_admin");
        when(accounts.findByUsername("platform_admin")).thenReturn(Optional.of(acc));
        when(accounts.findRoleCodesByAccountId(anyString())).thenReturn(List.of("SUPER_ADMIN"));
        when(profiles.resolve(any(), anyList()))
                .thenReturn(new AccessProfile("SUPER_ADMIN", null, Set.of()));
        when(jwt.generateAccessToken(anyString(), anyString(), any(), anyList(), any(), any(Boolean.class)))
                .thenReturn("access-token");
        when(jwt.accessTokenSeconds()).thenReturn(900L);
        when(refreshTokens.createRefreshToken(anyString())).thenReturn("refresh-token");

        LoginResponse response = service.login(new LoginRequest("platform_admin", PASSWORD));

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isEqualTo("refresh-token");
    }

    private Account account(String username) throws Exception {
        Account acc = new Account();
        setField(acc, "id", "acct-" + username);
        setField(acc, "username", username);
        setField(acc, "passwordHash", encoder.encode(PASSWORD));
        setField(acc, "status", "active");
        return acc;
    }

    private static void setField(Account target, String name, Object value) throws Exception {
        Field field = Account.class.getDeclaredField(name);
        field.setAccessible(true);
        field.set(target, value);
    }
}
