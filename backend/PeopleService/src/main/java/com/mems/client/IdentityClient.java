package com.mems.client;

import com.mems.dto.PermissionResponse;
import com.mems.dto.PermissionBundleResponse;
import com.mems.dto.MemberRequest;
import java.util.Map;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.env.Environment;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

@Component
public class IdentityClient {
    private static final Logger log = LoggerFactory.getLogger(IdentityClient.class);
    /** CC-01: danh mục quyền/module ít đổi — cache ngắn hạn để mỗi request không gọi Identity. */
    private static final long METADATA_TTL_MS = 30_000;
    private static final int METADATA_MAX_ENTRIES = 1_000;

    private record CacheEntry(Object value, long expiresAt) {}

    private final RestTemplate http;
    private final ConcurrentHashMap<String, CacheEntry> metadataCache = new ConcurrentHashMap<>();

    public IdentityClient(RestTemplateBuilder builder, Environment env) {
        String baseUrl = env.getProperty("IDENTITY_SERVICE_URL", "http://localhost:8081");
        log.info("IdentityService base URL: {}", baseUrl);
        http = builder.rootUri(baseUrl)
            .defaultHeader("X-Internal-Api-Key", env.getProperty("INTERNAL_API_KEY", ""))
            .setConnectTimeout(Duration.ofSeconds(3)).setReadTimeout(Duration.ofSeconds(5)).build();
    }

    /** Cho test: dùng RestTemplate đã cấu hình sẵn. */
    IdentityClient(RestTemplate http) {
        this.http = http;
    }

    @SuppressWarnings("unchecked")
    private <T> T cached(String key, Supplier<T> loader) {
        long now = System.currentTimeMillis();
        CacheEntry entry = metadataCache.get(key);
        if (entry != null && entry.expiresAt() > now) {
            return (T) entry.value();
        }
        T loaded = loader.get();
        if (metadataCache.size() >= METADATA_MAX_ENTRIES) metadataCache.clear();
        metadataCache.put(key, new CacheEntry(loaded, now + METADATA_TTL_MS));
        return loaded;
    }

    public List<PermissionResponse> permissions() {
        return cached("permissions", () -> {
            try {
                var response = http.exchange("/internal/permissions", HttpMethod.GET, null,
                    new ParameterizedTypeReference<List<PermissionResponse>>() {});
                if (response.getBody() == null) throw unavailable(null);
                return response.getBody();
            } catch (RestClientException ex) {
                throw unavailable(ex);
            }
        });
    }

    public List<PermissionBundleResponse> permissionBundles() {
        return cached("permission-bundles", () -> {
            try {
                var response = http.exchange("/internal/permissions/bundles", HttpMethod.GET, null,
                    new ParameterizedTypeReference<List<PermissionBundleResponse>>() {});
                if (response.getBody() == null) throw unavailable(null);
                return response.getBody();
            } catch (RestClientException ex) {
                throw unavailable(ex);
            }
        });
    }

    public List<String> activeModules(String orgId) {
        return cached("modules:" + orgId, () -> {
            try {
                var response = http.exchange(
                    "/internal/orgs/{orgId}/modules",
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<String>>() {},
                    orgId
                );
                if (response.getBody() == null) throw unavailable(null);
                return response.getBody();
            } catch (RestClientException ex) {
                throw unavailable(ex);
            }
        });
    }

    /** Returns full module status rows (code, status, is_core, is_locked_by_admin). */
    public List<java.util.Map<String, Object>> moduleStatus(String orgId) {
        return cached("module-status:" + orgId, () -> {
            try {
                var response = http.exchange(
                    "/internal/orgs/{orgId}/modules/status",
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<java.util.Map<String, Object>>>() {},
                    orgId
                );
                if (response.getBody() == null) throw unavailable(null);
                return response.getBody();
            } catch (RestClientException ex) {
                throw unavailable(ex);
            }
        });
    }

    public void createAccount(String id, String orgId, MemberRequest request, String password, String actorId) {
        try {
            http.postForEntity("/internal/accounts", Map.of(
                "userId", id, "orgId", orgId, "username", request.username().trim(), "email", request.email().trim(),
                "temporaryPassword", password, "role", request.role(), "appointedBy", actorId), Void.class);
        } catch (HttpClientErrorException.Conflict ex) {
            throw new AppException(ErrorCode.ACCOUNT_EXISTS);
        } catch (RestClientException ex) {
            throw unavailable(ex);
        }
    }

    /** Tạo tài khoản đăng nhập vai trò STUDENT từ hồ sơ học sinh đã có. */
    public void createStudentAccount(String id, String orgId, String username, String email,
                                     String password, String actorId) {
        try {
            http.postForEntity("/internal/accounts", Map.of(
                "userId", id, "orgId", orgId, "username", username, "email", email,
                "temporaryPassword", password, "role", "STUDENT", "appointedBy", actorId), Void.class);
        } catch (HttpClientErrorException.Conflict ex) {
            throw new AppException(ErrorCode.ACCOUNT_EXISTS);
        } catch (RestClientException ex) {
            throw unavailable(ex);
        }
    }

    public void deleteAccount(String id, String orgId) {
        http.delete("/internal/accounts/{id}?orgId={orgId}", id, orgId);
    }

    public void disableAccount(String id, String orgId) {
        try {
            http.patchForObject("/internal/accounts/{id}/disable?orgId={orgId}", null, Void.class, id, orgId);
        } catch (RestClientException ex) {
            throw unavailable(ex);
        }
    }

    public void enableAccount(String id, String orgId) {
        try {
            http.patchForObject("/internal/accounts/{id}/enable?orgId={orgId}", null, Void.class, id, orgId);
        } catch (RestClientException ex) {
            throw unavailable(ex);
        }
    }

    public String resetPassword(String id, String orgId) {
        try {
            var response = http.postForEntity(
                "/internal/accounts/{id}/reset-password?orgId={orgId}", null, Map.class, id, orgId);
            Object password = response.getBody() == null ? null : response.getBody().get("temporaryPassword");
            if (password == null) throw unavailable(null);
            return password.toString();
        } catch (HttpClientErrorException.NotFound ex) {
            throw new AppException(ErrorCode.ACCOUNT_NOT_FOUND);
        } catch (RestClientException ex) {
            throw unavailable(ex);
        }
    }

    private AppException unavailable(RestClientException cause) {
        if (cause != null) {
            log.warn("IdentityService call failed: {}", cause.toString());
        } else {
            log.warn("IdentityService returned an empty body");
        }
        return new AppException(ErrorCode.IDENTITY_UNAVAILABLE);
    }
}
