
package com.mems.service;

import com.mems.dto.LoginRequest;
import com.mems.dto.LoginResponse;
import com.mems.entity.Account;
import com.mems.exception.ApiException;
import com.mems.repository.IAccountRepository;
import com.mems.repository.IOrganizationRepository;
import com.mems.security.JwtService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private IAccountRepository accountRepository;

    @Mock
    private IOrganizationRepository organizationRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private RefreshTokenService refreshTokenService;

    @InjectMocks
    private AuthService authService;

    private Account account;
    private LoginRequest loginRequest;

    @BeforeEach
    void setUp() {
        // Account khong co setter cho cac truong.
        // Dung Mockito mock de gia lap du lieu.
        account = mock(Account.class);

        loginRequest = new LoginRequest(
                "admin",
                "password123"
        );
    }

    @Test
    void login_successfulSuperAdmin_returnsTokens() {
        // Arrange: tim thay tai khoan
        when(accountRepository.findByUsername("admin"))
                .thenReturn(Optional.of(account));

        when(account.getId())
                .thenReturn("account-1");

        when(account.getUsername())
                .thenReturn("admin");

        when(account.getPasswordHash())
                .thenReturn("hashed-password");

        when(account.getStatus())
                .thenReturn("active");

        when(account.getOrgId())
                .thenReturn(null);

        when(passwordEncoder.matches(
                "password123",
                "hashed-password"
        )).thenReturn(true);

        when(accountRepository.findRoleCodesByAccountId("account-1"))
                .thenReturn(List.of("SUPER_ADMIN"));

        when(jwtService.generateAccessToken(
                "account-1",
                "admin",
                null,
                List.of("SUPER_ADMIN")
        )).thenReturn("access-token");

        when(refreshTokenService.createRefreshToken("account-1"))
                .thenReturn("refresh-token");

        // Act: dang nhap
        LoginResponse response = authService.login(loginRequest);

        // Assert: kiem tra ket qua
        assertNotNull(response);
        assertEquals("access-token", response.accessToken());
        assertEquals("refresh-token", response.refreshToken());
        assertEquals("Bearer", response.tokenType());
        assertEquals(900, response.expiresIn());

        verify(accountRepository).save(account);

        verify(jwtService).generateAccessToken(
                "account-1",
                "admin",
                null,
                List.of("SUPER_ADMIN")
        );

        verify(refreshTokenService)
                .createRefreshToken("account-1");

        verifyNoInteractions(organizationRepository);
    }

    @Test
    void login_usernameNotFound_throwsApiException() {
        // Arrange
        when(accountRepository.findByUsername("admin"))
                .thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(
                ApiException.class,
                () -> authService.login(loginRequest)
        );

        // Khong duoc kiem tra mat khau neu khong tim thay account
        verifyNoInteractions(passwordEncoder);

        // Khong duoc tao token hoac luu account
        verify(accountRepository, never())
                .save(any(Account.class));

        verifyNoInteractions(jwtService, refreshTokenService);
        verifyNoInteractions(organizationRepository);
    }

    @Test
    void login_wrongPassword_throwsApiException() {
        // Arrange
        when(accountRepository.findByUsername("admin"))
                .thenReturn(Optional.of(account));

        when(account.getPasswordHash())
                .thenReturn("hashed-password");

        when(passwordEncoder.matches(
                "password123",
                "hashed-password"
        )).thenReturn(false);

        // Act & Assert
        assertThrows(
                ApiException.class,
                () -> authService.login(loginRequest)
        );

        // Khong tao token va khong cap nhat account
        verify(accountRepository, never())
                .save(any(Account.class));

        verifyNoInteractions(jwtService, refreshTokenService);
        verifyNoInteractions(organizationRepository);

        // Chi xac minh mat khau, khong kiem tra role
        verify(passwordEncoder).matches(
                "password123",
                "hashed-password"
        );

        verify(accountRepository, never())
                .findRoleCodesByAccountId(anyString());
    }

    @Test
    void login_inactiveAccount_throwsApiException() {
        // Arrange
        when(accountRepository.findByUsername("admin"))
                .thenReturn(Optional.of(account));

        when(account.getPasswordHash())
                .thenReturn("hashed-password");

        when(passwordEncoder.matches(
                "password123",
                "hashed-password"
        )).thenReturn(true);

        when(account.getStatus())
                .thenReturn("pending");

        // Act & Assert
        assertThrows(
                ApiException.class,
                () -> authService.login(loginRequest)
        );

        // Tai khoan chua active nen khong duoc tao token
        verify(accountRepository, never())
                .save(any(Account.class));

        verifyNoInteractions(jwtService, refreshTokenService);
        verifyNoInteractions(organizationRepository);

        // Phai dung lai o buoc kiem tra trang thai
        verify(accountRepository, never())
                .findRoleCodesByAccountId(anyString());
    }
}
