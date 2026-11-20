package com.mems.service;

import com.mems.entity.RefreshToken;
import com.mems.exception.AppException;
import com.mems.repository.IRefreshTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock
    private IRefreshTokenRepository repository;

    private RefreshTokenService service;

    @BeforeEach
    void setUp() {
        service = new RefreshTokenService(repository);
    }

    @Test
    @DisplayName("Token còn hiệu lực được chấp nhận, không thu hồi phiên")
    void activeTokenIsAccepted() {
        RefreshToken token = token();
        when(repository.findByTokenHash(anyString())).thenReturn(Optional.of(token));

        RefreshToken result = service.validateAndLock("raw-token");

        assertThat(result).isSameAs(token);
        verify(repository, never()).revokeAllActive(any(), any());
    }

    @Test
    @DisplayName("Token đã thu hồi bị dùng lại → thu hồi toàn bộ phiên và từ chối")
    void reusedRevokedTokenRevokesWholeFamily() {
        RefreshToken token = token();
        token.setRevokedAt(LocalDateTime.now(ZoneOffset.UTC));
        when(repository.findByTokenHash(anyString())).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> service.validateAndLock("raw-token"))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode())
                .isEqualTo("INVALID_REFRESH_TOKEN"));

        verify(repository).revokeAllActive(eq("acct-1"), any(LocalDateTime.class));
    }

    @Test
    @DisplayName("Token hết hạn bị từ chối nhưng không kích hoạt thu hồi phiên")
    void expiredTokenIsRejected() {
        RefreshToken token = token();
        token.setExpiresAt(LocalDateTime.now(ZoneOffset.UTC).minusMinutes(1));
        when(repository.findByTokenHash(anyString())).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> service.validateAndLock("raw-token"))
            .isInstanceOf(AppException.class);

        verify(repository, never()).revokeAllActive(any(), any());
    }

    private RefreshToken token() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        return new RefreshToken("token-1", "acct-1", "hash", now, now.plusDays(7));
    }
}
