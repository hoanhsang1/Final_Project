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

/** Module của tổ chức phải đang bật thì endpoint mới được chạy (quy tắc 4 PHẦN 7). */
@Component
public class OrganizationModuleGuard {
    private final RestTemplate http;

    public OrganizationModuleGuard(RestTemplateBuilder builder, Environment env) {
        http = builder.rootUri(env.getProperty("IDENTITY_SERVICE_URL", "http://localhost:8081"))
            .defaultHeader("X-Internal-Api-Key", env.getProperty("INTERNAL_API_KEY", ""))
            .setConnectTimeout(Duration.ofSeconds(3))
            .setReadTimeout(Duration.ofSeconds(5))
            .build();
    }

    public void requireModule(String orgId, String moduleCode) {
        try {
            var response = http.exchange("/internal/orgs/{orgId}/modules", HttpMethod.GET, null,
                new ParameterizedTypeReference<List<String>>() {}, orgId);
            List<String> modules = response.getBody();
            if (modules == null || !modules.contains(moduleCode)) {
                throw new AppException(ErrorCode.MODULE_NOT_ENABLED,
                    "Module " + moduleCode + " is not enabled for organization");
            }
        } catch (RestClientException ex) {
            throw new AppException(ErrorCode.IDENTITY_UNAVAILABLE);
        }
    }
}
