package com.mems.security;

import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Module guard for ScheduleService (BE-00.2 §3.3).
 *
 * <p>Implements DEC-11 read-only semantics:
 * <ul>
 *   <li>{@link #requireModuleForWrite} — only 'active' passes (mutating endpoints).</li>
 *   <li>{@link #requireModuleReadable} — 'active', 'disabled', 'locked' all pass (GET endpoints).</li>
 *   <li>{@link #requireModule} — legacy alias for {@link #requireModuleForWrite}.</li>
 * </ul>
 */
@Component
public class OrganizationModuleGuard {

    private final RestTemplate http;

    public OrganizationModuleGuard(RestTemplateBuilder builder, Environment env) {
        http = builder
            .rootUri(env.getProperty("IDENTITY_SERVICE_URL", "http://localhost:8081"))
            .defaultHeader("X-Internal-Api-Key", env.getProperty("INTERNAL_API_KEY", ""))
            .setConnectTimeout(Duration.ofSeconds(3))
            .setReadTimeout(Duration.ofSeconds(5))
            .build();
    }

    /** Legacy alias — write guard. */
    public void requireModule(String orgId, String moduleCode) {
        requireModuleForWrite(orgId, moduleCode);
    }

    /**
     * Write guard: module must be 'active'. Call on POST/PUT/PATCH/DELETE.
     */
    public void requireModuleForWrite(String orgId, String moduleCode) {
        try {
            var response = http.exchange(
                "/internal/orgs/{orgId}/modules",
                HttpMethod.GET, null,
                new ParameterizedTypeReference<List<String>>() {}, orgId);
            List<String> modules = response.getBody();
            if (modules == null || !modules.contains(moduleCode)) {
                String detail = resolveDisabledDetail(orgId, moduleCode);
                throw new AppException(ErrorCode.MODULE_NOT_ENABLED, detail);
            }
        } catch (AppException ex) {
            throw ex;
        } catch (RestClientException ex) {
            throw new AppException(ErrorCode.IDENTITY_UNAVAILABLE);
        }
    }

    /**
     * Read guard: module must be registered (active/disabled/locked). Call on GET endpoints.
     */
    public void requireModuleReadable(String orgId, String moduleCode) {
        try {
            List<Map<String, Object>> statuses = fetchModuleStatus(orgId);
            boolean known = statuses.stream()
                .anyMatch(row -> moduleCode.equals(row.get("code"))
                    && !"not_registered".equals(row.get("status")));
            if (!known) {
                throw new AppException(ErrorCode.MODULE_NOT_ENABLED,
                    "Module " + moduleCode + " is not registered for this organization");
            }
        } catch (AppException ex) {
            throw ex;
        } catch (RestClientException ex) {
            throw new AppException(ErrorCode.IDENTITY_UNAVAILABLE);
        }
    }

    public boolean isActive(String orgId, String moduleCode) {
        try {
            var response = http.exchange(
                "/internal/orgs/{orgId}/modules",
                HttpMethod.GET, null,
                new ParameterizedTypeReference<List<String>>() {}, orgId);
            List<String> modules = response.getBody();
            return modules != null && modules.contains(moduleCode);
        } catch (RestClientException ex) {
            return false;
        }
    }

    private String resolveDisabledDetail(String orgId, String moduleCode) {
        try {
            for (Map<String, Object> row : fetchModuleStatus(orgId)) {
                if (moduleCode.equals(row.get("code"))) {
                    String status = (String) row.get("status");
                    if ("locked".equals(status)) {
                        return "Module " + moduleCode + " has been locked by a system administrator";
                    }
                    if ("disabled".equals(status)) {
                        return "Module " + moduleCode + " is currently disabled (read-only mode)";
                    }
                    return "Module " + moduleCode + " is not active";
                }
            }
        } catch (Exception ignored) {}
        return "Module " + moduleCode + " is not enabled for this organization";
    }

    private List<Map<String, Object>> fetchModuleStatus(String orgId) {
        var response = http.exchange(
            "/internal/orgs/{orgId}/modules/status",
            HttpMethod.GET, null,
            new ParameterizedTypeReference<List<Map<String, Object>>>() {}, orgId);
        return response.getBody() == null ? List.of() : response.getBody();
    }
}
