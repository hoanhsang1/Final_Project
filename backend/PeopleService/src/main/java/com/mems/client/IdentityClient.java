package com.mems.client;

import com.mems.dto.PermissionResponse;
import com.mems.dto.MemberRequest;
import java.util.Map;
import com.mems.exception.ApiException;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.env.Environment;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;
import java.time.Duration;
import java.util.List;

@Component
public class IdentityClient {
    private final RestTemplate http;

    public IdentityClient(RestTemplateBuilder builder, Environment env) {
        http = builder.rootUri(env.getProperty("IDENTITY_SERVICE_URL", "http://localhost:8081"))
            .defaultHeader("X-Internal-Api-Key", env.getProperty("INTERNAL_API_KEY", ""))
            .setConnectTimeout(Duration.ofSeconds(3)).setReadTimeout(Duration.ofSeconds(5)).build();
    }

    public List<PermissionResponse> permissions() {
        try {
            var response = http.exchange("/internal/permissions", HttpMethod.GET, null,
                new ParameterizedTypeReference<List<PermissionResponse>>() {});
            if (response.getBody() == null) throw unavailable();
            return response.getBody();
        } catch (RestClientException ex) {
            throw unavailable();
        }
    }

    public List<String> activeModules(String orgId) {
        try {
            var response = http.exchange(
                "/internal/orgs/{orgId}/modules",
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<List<String>>() {},
                orgId
            );
            if (response.getBody() == null) throw unavailable();
            return response.getBody();
        } catch (RestClientException ex) {
            throw unavailable();
        }
    }

    public void createAccount(String id, String orgId, MemberRequest request, String password, String actorId) {
        try {
            http.postForEntity("/internal/accounts", Map.of(
                "userId", id, "orgId", orgId, "username", request.username().trim(), "email", request.email().trim(),
                "temporaryPassword", password, "role", request.role(), "appointedBy", actorId), Void.class);
        } catch (HttpClientErrorException.Conflict ex) {
            throw new ApiException(HttpStatus.CONFLICT, "ACCOUNT_EXISTS", "Account already exists or organization is inactive");
        } catch (RestClientException ex) {
            throw unavailable();
        }
    }

    public void deleteAccount(String id, String orgId) {
        http.delete("/internal/accounts/{id}?orgId={orgId}", id, orgId);
    }

    private ApiException unavailable() {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "IDENTITY_UNAVAILABLE", "Identity service unavailable");
    }
}
