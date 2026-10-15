
package com.mems.service;

import com.mems.entity.RefreshToken;
import com.mems.exception.ApiException;
import com.mems.repository.IRefreshTokenRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class RefreshTokenService implements IRefreshTokenService {

    private final IRefreshTokenRepository repository;
    private final SecureRandom secureRandom = new SecureRandom();

    public RefreshTokenService(IRefreshTokenRepository repository) {
        this.repository = repository;
    }

    private LocalDateTime nowUtc() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    @Override
    public String createRefreshToken(String accountId) {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);

        String rawToken = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(randomBytes);

        String tokenHash = hashToken(rawToken);
        LocalDateTime now = nowUtc();

        RefreshToken entity = new RefreshToken(
                UUID.randomUUID().toString(),
                accountId,
                tokenHash,
                now,
                now.plusDays(7)
        );

        repository.save(entity);

        return rawToken;
    }

    @Override
    public RefreshToken validateAndLock(String rawToken) {

        if (rawToken == null || rawToken.isBlank()) {
            throw invalidToken();
        }

        RefreshToken token = repository
                .findByTokenHash(hashToken(rawToken))
                .orElseThrow(this::invalidToken);

        if (token.getRevokedAt() != null) {
            throw invalidToken();
        }

        if (!token.getExpiresAt().isAfter(nowUtc())) {
            throw invalidToken();
        }

        return token;
    }

    @Override
    public String rotate(RefreshToken oldToken) {

        // Tao token moi
        String newRawToken = createRefreshToken(
                oldToken.getAccountId()
        );

        // Tim ban ghi moi qua hash
        RefreshToken newToken = repository
                .findByTokenHash(hashToken(newRawToken))
                .orElseThrow(() -> new IllegalStateException(
                        "New refresh token not found"
                ));

        // Thu hoi token cu
        oldToken.setRevokedAt(nowUtc());
        oldToken.setReplacedBy(newToken.getId());

        repository.save(oldToken);

        return newRawToken;
    }

    @Override
    public void revoke(RefreshToken token) {
        token.setRevokedAt(nowUtc());
        repository.save(token);
    }

    private ApiException invalidToken() {
        return new ApiException(
                HttpStatus.UNAUTHORIZED,
                "Invalid or expired refresh token"
        );
    }

    private String hashToken(String rawToken) {
        try {
            byte[] hash = MessageDigest
                    .getInstance("SHA-256")
                    .digest(
                        rawToken.getBytes(StandardCharsets.UTF_8)
                    );

            return HexFormat.of().formatHex(hash);

        } catch (Exception ex) {
            throw new IllegalStateException(
                    "Could not hash refresh token", ex
            );
        }
    }
}
