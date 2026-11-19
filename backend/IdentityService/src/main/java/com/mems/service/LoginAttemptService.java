package com.mems.service;

import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory brute-force guard for the login endpoint.
 *
 * <p>Failures are counted per username+source IP and per username. A lock is
 * temporary and the response is identical for existing and unknown usernames,
 * so the caller cannot use it to enumerate accounts. The limiter is
 * deliberately not per-IP-wide: behind the gateway many users share one
 * address, and an address-wide lock would deny legitimate traffic.</p>
 */
@Service
public class LoginAttemptService {

    private static final Logger log = LoggerFactory.getLogger(LoginAttemptService.class);

    static final int MAX_PAIR_FAILURES = 5;
    static final int MAX_USER_FAILURES = 20;
    static final Duration WINDOW = Duration.ofMinutes(15);
    static final Duration LOCK = Duration.ofMinutes(15);
    private static final int MAX_ENTRIES = 10_000;

    private final JdbcTemplate jdbc;
    private final Map<String, Counter> counters = new ConcurrentHashMap<>();

    public LoginAttemptService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void assertAllowed(String username, String clientIp) {
        Instant now = Instant.now();
        assertNotLocked(pairKey(username, clientIp), now);
        assertNotLocked(userKey(username), now);
    }

    public void recordFailure(String username, String clientIp, String accountId) {
        Instant now = Instant.now();
        Counter pair = counters.computeIfAbsent(pairKey(username, clientIp), k -> new Counter());
        Counter user = counters.computeIfAbsent(userKey(username), k -> new Counter());
        if (pair.registerFailure(now, MAX_PAIR_FAILURES, WINDOW, LOCK)) {
            log.warn("Login temporarily locked for username={} ip={} after repeated failures", username, clientIp);
        }
        if (user.registerFailure(now, MAX_USER_FAILURES, WINDOW, LOCK)) {
            log.warn("Login temporarily locked for username={} after repeated failures", username);
        }
        auditFailure(username, clientIp, accountId);
        purgeIfLarge(now);
    }

    public void recordSuccess(String username, String clientIp) {
        counters.remove(pairKey(username, clientIp));
        counters.remove(userKey(username));
    }

    private void assertNotLocked(String key, Instant now) {
        Counter counter = counters.get(key);
        if (counter != null && counter.lockedUntil != null && now.isBefore(counter.lockedUntil)) {
            throw new AppException(ErrorCode.LOGIN_RATE_LIMITED);
        }
    }

    private void auditFailure(String username, String clientIp, String accountId) {
        try {
            String details = "{\"username\":\"" + jsonEscape(username) + "\",\"ip\":\"" + jsonEscape(clientIp) + "\"}";
            jdbc.update("""
                INSERT INTO audit_log(actor_account_id, action, entity_type, entity_id, new_value)
                VALUES (?, 'LOGIN_FAILED', 'ACCOUNT', ?, CAST(? AS JSON))
                """, accountId, accountId, details);
        } catch (Exception ex) {
            log.warn("Could not write LOGIN_FAILED audit entry: {}", ex.getMessage());
        }
    }

    private static String jsonEscape(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private void purgeIfLarge(Instant now) {
        if (counters.size() <= MAX_ENTRIES) return;
        Iterator<Map.Entry<String, Counter>> it = counters.entrySet().iterator();
        while (it.hasNext()) {
            Counter c = it.next().getValue();
            if ((c.lockedUntil == null || now.isAfter(c.lockedUntil)) && c.isWindowExpired(now)) {
                it.remove();
            }
        }
    }

    private static String pairKey(String username, String clientIp) {
        return "u:" + username + "|" + (clientIp == null || clientIp.isBlank() ? "-" : clientIp);
    }

    private static String userKey(String username) {
        return "g:" + username;
    }

    private static final class Counter {
        private int failures;
        private Instant windowStart;
        private Instant lockedUntil;

        boolean registerFailure(Instant now, int max, Duration window, Duration lock) {
            if (lockedUntil != null) {
                if (now.isBefore(lockedUntil)) return false;
                lockedUntil = null;
                failures = 0;
                windowStart = null;
            }
            if (windowStart == null || now.isAfter(windowStart.plus(window))) {
                windowStart = now;
                failures = 0;
            }
            failures++;
            if (failures >= max) {
                lockedUntil = now.plus(lock);
                failures = 0;
                windowStart = null;
                return true;
            }
            return false;
        }

        boolean isWindowExpired(Instant now) {
            return windowStart == null || now.isAfter(windowStart.plus(WINDOW));
        }
    }
}
