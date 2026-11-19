
package com.mems.service;

import com.mems.dto.LoginRequest;
import com.mems.dto.LoginResponse;
import com.mems.dto.LogoutRequest;
import com.mems.dto.RefreshTokenRequest;

import com.mems.entity.Account;
import com.mems.entity.RefreshToken;

import com.mems.repository.IAccountRepository;
import com.mems.repository.IOrganizationRepository;

import com.mems.security.JwtService;
import com.mems.service.impl.IAuthService;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class AuthService implements IAuthService {

    private final IAccountRepository accountRepository;
    private final IOrganizationRepository organizationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final AccessProfileService accessProfiles;
    private final LoginAttemptService loginAttempts;
    // Real BCrypt hash used to keep the failure path constant-time for unknown usernames.
    private final String dummyHash;

    public AuthService(
            IAccountRepository accountRepository,
            IOrganizationRepository organizationRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            RefreshTokenService refreshTokenService,
            AccessProfileService accessProfiles,
            LoginAttemptService loginAttempts
    ) {
        this.accountRepository = accountRepository;
        this.organizationRepository = organizationRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.accessProfiles = accessProfiles;
        this.loginAttempts = loginAttempts;
        this.dummyHash = passwordEncoder.encode("not-a-real-password-" + java.util.UUID.randomUUID());
    }

    // Kiem tra trang thai account, role va organization
    // Su dung chung cho Login va Refresh
    private List<String> validateAccount(Account acc) {

        // 1. Kiem tra trang thai tai khoan
        if (!"active".equals(acc.getStatus())) {
            throw new AppException(ErrorCode.ACCOUNT_NOT_ACTIVE);
        }

        // 2. Lay roles
        List<String> roles = accountRepository
                .findRoleCodesByAccountId(acc.getId());

        if (roles == null || roles.isEmpty()) {
            throw new AppException(ErrorCode.ACCOUNT_NO_ROLES);
        }

        // 3. Phan biet tai khoan nen tang va to chuc
        boolean isSuperAdmin = roles.contains("SUPER_ADMIN");
        String orgId = acc.getOrgId();

        if (isSuperAdmin) {

            if (orgId != null || roles.size() != 1) {
                throw new AppException(ErrorCode.INVALID_SUPER_ADMIN);
            }

        } else {

            // Tai khoan thong thuong bat buoc co orgId
            if (orgId == null || orgId.isBlank()) {
                throw new AppException(ErrorCode.ORGANIZATION_REQUIRED);
            }

            // To chuc phai ton tai
            String orgStatus = organizationRepository
                    .findOrganizationStatus(orgId)
                    .orElseThrow(() -> new AppException(
                            ErrorCode.ORGANIZATION_NOT_FOUND, HttpStatus.FORBIDDEN));

            // To chuc phai dang active
            if (!"active".equals(orgStatus)) {
                throw new AppException(ErrorCode.ORGANIZATION_INACTIVE);
            }
        }

        return roles;
    }

    // LOGIN
    @Override
    @Transactional
    public LoginResponse login(LoginRequest request) {
        return login(request, null);
    }

    @Override
    @Transactional
    public LoginResponse login(LoginRequest request, String clientIp) {

        String usernameKey = request.username() == null ? "" : request.username().trim().toLowerCase(java.util.Locale.ROOT);

        // 0. Chan do mat khau truoc khi cham database
        loginAttempts.assertAllowed(usernameKey, clientIp);

        // 1. Tim account
        Account acc = accountRepository
                .findByUsername(request.username())
                .orElse(null);

        // 2. Xac minh mat khau (luon chay BCrypt de khong lo username qua thoi gian phan hoi)
        boolean matches = passwordEncoder.matches(
                request.password(),
                acc == null ? dummyHash : acc.getPasswordHash());

        if (acc == null || !matches) {
            loginAttempts.recordFailure(usernameKey, clientIp, acc == null ? null : acc.getId());
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        }
        loginAttempts.recordSuccess(usernameKey, clientIp);

        // 3. Kiem tra quyen va to chuc
        List<String> roles = validateAccount(acc);

        // 4. Tao Access Token
        String accessToken = jwtService.generateAccessToken(
                acc.getId(),
                acc.getUsername(),
                acc.getOrgId(),
                roles,
                accessProfiles.resolve(acc, roles),
                acc.isMustChangePassword()
        );

        // 5. Tao Refresh Token
        String refreshToken = refreshTokenService
                .createRefreshToken(acc.getId());

        // 6. Cap nhat lan dang nhap cuoi
        acc.setLastLoginAt(
                LocalDateTime.now(ZoneOffset.UTC)
        );

        accountRepository.save(acc);

        return new LoginResponse(
                accessToken,
                refreshToken,
                "Bearer",
                jwtService.accessTokenSeconds()
        );
    }

    // REFRESH TOKEN
    @Override
    @Transactional
    public LoginResponse refresh(RefreshTokenRequest request) {

        // 1. Kiem tra va khoa Refresh Token hien tai
        RefreshToken oldToken = refreshTokenService
                .validateAndLock(request.refreshToken());

        // 2. Lay account tu database
        Account acc = accountRepository
                .findById(oldToken.getAccountId())
                .orElseThrow(() -> new AppException(
                        ErrorCode.ACCOUNT_NOT_FOUND, HttpStatus.UNAUTHORIZED));

        // 3. Kiem tra lai trang thai, quyen va to chuc
        List<String> roles = validateAccount(acc);

        // 4. Tao Access Token moi
        String accessToken = jwtService.generateAccessToken(
                acc.getId(),
                acc.getUsername(),
                acc.getOrgId(),
                roles,
                accessProfiles.resolve(acc, roles),
                acc.isMustChangePassword()
        );

        // 5. Thu hoi Refresh Token cu va tao token moi
        String newRefreshToken = refreshTokenService
                .rotate(oldToken);

        return new LoginResponse(
                accessToken,
                newRefreshToken,
                "Bearer",
                jwtService.accessTokenSeconds()
        );
    }

    // LOGOUT
    @Override
    @Transactional
    public void logout(LogoutRequest request) {

        // 1. Xac minh Refresh Token
        RefreshToken token = refreshTokenService
                .validateAndLock(request.refreshToken());

        // 2. Thu hoi Refresh Token
        refreshTokenService.revoke(token);
    }
}
