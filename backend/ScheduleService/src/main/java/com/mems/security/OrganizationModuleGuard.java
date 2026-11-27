package com.mems.security;

import com.mems.exception.ApiException;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/** Kiểm tra module tổ chức theo DEC-11: chỉ module 'active' được ghi (POST/PUT/PATCH/DELETE). */
@Component
public class OrganizationModuleGuard {
    private final RestTemplate http;

    public OrganizationModuleGuard(RestTemplateBuilder builder, Environment env) {
        http = builder.rootUri(env.getProperty("identity.service.url", "http://localhost:8081"))
            .defaultHeader("X-Internal-Api-Key", env.getProperty("internal.api.key", ""))
            .setConnectTimeout(Duration.ofSeconds(3))
            .setReadTimeout(Duration.ofSeconds(5))
            .build();
    }

    public void requireModuleForWrite(String orgId, String moduleCode) {
        List<String> active;
        try {
            active = http.exchange("/internal/orgs/{orgId}/modules", HttpMethod.GET, null,
                new ParameterizedTypeReference<List<String>>() {}, orgId).getBody();
        } catch (RestClientException ex) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "IDENTITY_UNAVAILABLE",
                "Không thể kiểm tra module của tổ chức: " + ex.getMessage());
        }
        if (active != null && active.contains(moduleCode)) return;
        throw new ApiException(HttpStatus.FORBIDDEN, "MODULE_NOT_ENABLED", disabledDetail(orgId, moduleCode));
    }

    /** Lấy lý do cụ thể (đang tắt / bị khoá / chưa đăng ký) để trả về cho người dùng. */
    private String disabledDetail(String orgId, String moduleCode) {
        try {
            var response = http.exchange("/internal/orgs/{orgId}/modules/status", HttpMethod.GET, null,
                new ParameterizedTypeReference<List<Map<String, Object>>>() {}, orgId);
            if (response.getBody() != null) {
                for (Map<String, Object> row : response.getBody()) {
                    if (moduleCode.equals(row.get("code"))) {
                        String state = String.valueOf(row.get("status"));
                        return switch (state) {
                            case "locked" -> "Module " + moduleCode + " đã bị khoá bởi quản trị hệ thống";
                            case "disabled" -> "Module " + moduleCode + " đang tắt (chỉ xem)";
                            default -> "Module " + moduleCode + " chưa được kích hoạt";
                        };
                    }
                }
            }
        } catch (Exception ignored) {
            // Không lấy được trạng thái chi tiết → dùng thông báo chung.
        }
        return "Module " + moduleCode + " chưa được kích hoạt cho tổ chức này";
    }
}
