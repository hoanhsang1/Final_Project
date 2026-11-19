package com.mems.service;

import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

class LoginAttemptServiceTest {

    private final LoginAttemptService service = new LoginAttemptService(mock(JdbcTemplate.class));

    @Test
    @DisplayName("Allows login while below the failure threshold")
    void allowsBelowThreshold() {
        for (int i = 0; i < LoginAttemptService.MAX_PAIR_FAILURES - 1; i++) {
            service.recordFailure("alice", "10.0.0.1", "acct-1");
        }
        assertThatCode(() -> service.assertAllowed("alice", "10.0.0.1")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Locks the username+IP pair after five failures")
    void locksAfterFiveFailures() {
        for (int i = 0; i < LoginAttemptService.MAX_PAIR_FAILURES; i++) {
            service.recordFailure("alice", "10.0.0.1", "acct-1");
        }
        assertThatThrownBy(() -> service.assertAllowed("alice", "10.0.0.1"))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                        .isEqualTo(ErrorCode.LOGIN_RATE_LIMITED));
    }

    @Test
    @DisplayName("A different IP is not blocked by another pair's failures")
    void isolatesPairs() {
        for (int i = 0; i < LoginAttemptService.MAX_PAIR_FAILURES; i++) {
            service.recordFailure("alice", "10.0.0.1", "acct-1");
        }
        assertThatCode(() -> service.assertAllowed("alice", "10.0.0.2")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Successful login clears all counters for that username")
    void successClearsCounters() {
        for (int i = 0; i < LoginAttemptService.MAX_PAIR_FAILURES; i++) {
            service.recordFailure("alice", "10.0.0.1", "acct-1");
        }
        service.recordSuccess("alice", "10.0.0.1");
        assertThatCode(() -> service.assertAllowed("alice", "10.0.0.1")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Distributed failures on one username hit the global cap")
    void globalCapBlocksSpraying() {
        for (int i = 0; i < LoginAttemptService.MAX_USER_FAILURES; i++) {
            service.recordFailure("alice", "10.0.0." + (i % 200), "acct-1");
        }
        assertThatThrownBy(() -> service.assertAllowed("alice", "10.9.9.9"))
                .isInstanceOf(AppException.class);
    }
}
