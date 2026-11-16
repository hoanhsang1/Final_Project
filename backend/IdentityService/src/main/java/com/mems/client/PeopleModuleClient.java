package com.mems.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Map;

/**
 * HTTP client used by IdentityService to query PeopleService for pending
 * workflow counts before allowing a module disable (kế hoạch v2 §0.2).
 *
 * <p>Calls {@code GET /internal/modules/{moduleCode}/pending-count?orgId={orgId}}
 * on PeopleService. Any exception from this call is intentionally propagated
 * to the caller so the caller can apply fail-closed logic.</p>
 */
@Component
public class PeopleModuleClient {

    private static final Logger log = LoggerFactory.getLogger(PeopleModuleClient.class);

    private final RestTemplate http;

    public PeopleModuleClient(RestTemplateBuilder builder, Environment env) {
        String baseUrl = env.getProperty("PEOPLE_SERVICE_URL", "http://localhost:8082");
        log.info("PeopleService base URL (module client): {}", baseUrl);
        http = builder
            .rootUri(baseUrl)
            .defaultHeader("X-Internal-Api-Key", env.getProperty("INTERNAL_API_KEY", ""))
            .setConnectTimeout(Duration.ofSeconds(3))
            .setReadTimeout(Duration.ofSeconds(5))
            .build();
    }

    /**
     * Returns the number of pending workflow items for the given module in the given org.
     *
     * @throws RestClientException (or any RuntimeException) if PeopleService is unreachable
     *                             or returns an unexpected response — caller must treat this
     *                             as "unknown / possibly pending" and block the disable.
     */
    @SuppressWarnings("unchecked")
    public int pendingWorkflowCount(String orgId, String moduleCode) {
        Map<String, Object> body = http.getForObject(
            "/internal/modules/{moduleCode}/pending-count?orgId={orgId}",
            Map.class,
            moduleCode, orgId);
        if (body == null || !body.containsKey("pendingCount")) {
            throw new IllegalStateException(
                "PeopleService returned null or missing pendingCount for module: " + moduleCode);
        }
        Object raw = body.get("pendingCount");
        if (raw instanceof Number n) {
            return n.intValue();
        }
        throw new IllegalStateException(
            "PeopleService returned non-numeric pendingCount: " + raw);
    }
}
