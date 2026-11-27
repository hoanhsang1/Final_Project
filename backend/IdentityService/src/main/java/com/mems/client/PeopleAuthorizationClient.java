package com.mems.client;

import com.mems.dto.AccessProfile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Map;
import java.util.Set;

/**
 * Lấy quyền hiệu lực của MANAGER/STAFF từ PeopleService.
 *
 * <p>PeopleService lỗi không được chặn đăng nhập: dùng bản ghi last-known-good
 * (tối đa {@value #HARD_LIMIT_MS} ms) hoặc trả hồ sơ RỖNG kèm cờ stale. Không
 * bao giờ tự cấp toàn bộ quyền — People luôn tính lại quyền thật ở mỗi request.</p>
 */
@Component
public class PeopleAuthorizationClient {
    private static final Logger log = LoggerFactory.getLogger(PeopleAuthorizationClient.class);
    private static final long FRESH_MS = 60_000;
    private static final long HARD_LIMIT_MS = 600_000;
    private static final Set<String> EMPLOYEE_ROLES = Set.of("MANAGER", "STAFF");

    private final RestTemplate http;
    private final AccessProfileCache cache;

    @Autowired
    public PeopleAuthorizationClient(RestTemplateBuilder builder, Environment env) {
        this(builder.rootUri(env.getProperty("PEOPLE_SERVICE_URL", "http://localhost:8082"))
                .defaultHeader("X-Internal-Api-Key", env.getProperty("INTERNAL_API_KEY", ""))
                .setConnectTimeout(Duration.ofSeconds(3)).setReadTimeout(Duration.ofSeconds(5)).build(),
            new AccessProfileCache(FRESH_MS, HARD_LIMIT_MS, System::currentTimeMillis));
    }

    /** Cho test: RestTemplate và cache đã cấu hình sẵn. */
    PeopleAuthorizationClient(RestTemplate http, AccessProfileCache cache) {
        this.http = http;
        this.cache = cache;
    }

    /**
     * @param fallbackRole role tài khoản (MANAGER/STAFF) dùng khi People không trả lời.
     */
    public AccessProfile resolve(String userId, String orgId, String fallbackRole) {
        String key = AccessProfileCache.key(orgId, userId);
        var fresh = cache.fresh(key);
        if (fresh.isPresent()) return fresh.get();
        try {
            AccessProfile profile = fetch(userId, orgId);
            cache.put(key, profile);
            return profile;
        } catch (RuntimeException ex) {
            log.warn("People authorization unavailable for user={} org={}: {}", userId, orgId, ex.toString());
            return cache.lastKnownGood(key)
                .orElseGet(() -> new AccessProfile(fallbackRole, null, Set.of(), Map.of(), Set.of(), true));
        }
    }

    private AccessProfile fetch(String userId, String orgId) {
        try {
            AccessProfile profile = http.getForObject(
                "/internal/users/{id}/authorization?orgId={orgId}", AccessProfile.class, userId, orgId);
            if (profile == null || profile.permissions() == null
                    || profile.role() == null || !EMPLOYEE_ROLES.contains(profile.role())) {
                throw new IllegalStateException("Invalid authorization response");
            }
            return profile;
        } catch (RestClientException ex) {
            throw new IllegalStateException("People authorization call failed", ex);
        }
    }
}
