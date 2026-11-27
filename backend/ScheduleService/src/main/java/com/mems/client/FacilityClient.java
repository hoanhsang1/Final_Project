package com.mems.client;

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

/** Đọc phòng từ FacilityService qua API nội bộ. */
@Component
public class FacilityClient {
    private final RestTemplate http;

    public FacilityClient(RestTemplateBuilder builder, Environment env) {
        http = builder.rootUri(env.getProperty("facility.service.url", "http://localhost:8084"))
            .defaultHeader("X-Internal-Api-Key", env.getProperty("internal.api.key", ""))
            .setConnectTimeout(Duration.ofSeconds(3))
            .setReadTimeout(Duration.ofSeconds(5))
            .build();
    }

    /** Phòng của toàn tổ chức — phòng là tài nguyên cấp org, không thuộc riêng phòng ban (S7). */
    public List<RoomInfo> roomsOfOrg(String orgId) {
        try {
            var response = http.exchange("/internal/rooms?orgId={orgId}", HttpMethod.GET, null,
                new ParameterizedTypeReference<List<RoomInfo>>() {}, orgId);
            return response.getBody() == null ? List.of() : response.getBody();
        } catch (RestClientException ex) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "FACILITY_UNAVAILABLE",
                "Không thể lấy danh sách phòng: " + ex.getMessage());
        }
    }
}
