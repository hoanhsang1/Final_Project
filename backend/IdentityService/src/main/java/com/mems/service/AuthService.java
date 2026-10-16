
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
import com.mems.exception.ApiException;

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

    public AuthService(
            IAccountRepository accountRepository,
            IOrganizationRepository organizationRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            RefreshTokenService refreshTokenService
    ) {
        this.accountRepository = accountRepository;
        this.organizationRepository = organizationRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
    }

    // Kiem tra trang thai account, role va organization
    // Su dung chung cho Login va Refresh
    private List<String> validateAccount(Account acc) {

        // 1. Kiem tra trang thai tai khoan
        if (!"active".equals(acc.getStatus())) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "Account is not active"
            );
        }

        // 2. Lay roles
        List<String> roles = accountRepository
                .findRoleCodesByAccountId(acc.getId());

        if (roles == null || roles.isEmpty()) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "Account has no assigned roles"
            );
        }

        // 3. Phan biet tai khoan nen tang va to chuc
        boolean isSuperAdmin = roles.contains("SUPER_ADMIN");
        String orgId = acc.getOrgId();

        if (isSuperAdmin) {

            if (orgId != null || roles.size() != 1) {
                throw new ApiException(
                        HttpStatus.FORBIDDEN,
                        "Invalid SUPER_ADMIN account configuration"
                );
            }

        } else {

            // Tai khoan thong thuong bat buoc co orgId
            if (orgId == null || orgId.isBlank()) {
                throw new ApiException(
                        HttpStatus.FORBIDDEN,
                        "Organization is required"
                );
            }

            // To chuc phai ton tai
            String orgStatus = organizationRepository
                    .findOrganizationStatus(orgId)
                    .orElseThrow(() -> new ApiException(
                            HttpStatus.FORBIDDEN,
                            "Organization not found"
                    ));

            // To chuc phai dang active
            if (!"active".equals(orgStatus)) {
                throw new ApiException(
                        HttpStatus.FORBIDDEN,
                        "Organization is not active"
                );
            }
        }

        return roles;
    }

    // LOGIN
    @Override
    @Transactional
    public LoginResponse login(LoginRequest request) {

        // 1. Tim account
        Account acc = accountRepository
                .findByUsername(request.username())
                .orElseThrow(() -> new ApiException(
                        HttpStatus.UNAUTHORIZED,
                        "Invalid username or password"
                ));

        // 2. Xac minh mat khau
        if (!passwordEncoder.matches(
                request.password(),
                acc.getPasswordHash()
        )) {
            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid username or password"
            );
        }

        // 3. Kiem tra quyen va to chuc
        List<String> roles = validateAccount(acc);

        // 4. Tao Access Token
        String accessToken = jwtService.generateAccessToken(
                acc.getId(),
                acc.getUsername(),
                acc.getOrgId(),
                roles
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
                900
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
                .orElseThrow(() -> new ApiException(
                        HttpStatus.UNAUTHORIZED,
                        "Account not found"
                ));

        // 3. Kiem tra lai trang thai, quyen va to chuc
        List<String> roles = validateAccount(acc);

        // 4. Tao Access Token moi
        String accessToken = jwtService.generateAccessToken(
                acc.getId(),
                acc.getUsername(),
                acc.getOrgId(),
                roles
        );

        // 5. Thu hoi Refresh Token cu va tao token moi
        String newRefreshToken = refreshTokenService
                .rotate(oldToken);

        return new LoginResponse(
                accessToken,
                newRefreshToken,
                "Bearer",
                900
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
