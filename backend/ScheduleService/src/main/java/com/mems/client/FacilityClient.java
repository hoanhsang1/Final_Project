package com.mems.client;

import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.List;

/** Đọc trạng thái phòng từ FacilityService qua API nội bộ. */
@Component
public class FacilityClient {
    private final RestTemplate http;

    public FacilityClient(RestTemplateBuilder builder, Environment env) {
        http = builder.rootUri(env.getProperty("FACILITY_SERVICE_URL", "http://localhost:8084"))
            .defaultHeader("X-Internal-Api-Key", env.getProperty("INTERNAL_API_KEY", ""))
            .setConnectTimeout(Duration.ofSeconds(3))
            .setReadTimeout(Duration.ofSeconds(5))
            .build();
    }

    /** Trả `null` khi phòng không tồn tại trong tổ chức. */
    public RoomInfo room(String orgId, String roomId) {
        try {
            return http.exchange("/internal/rooms/{roomId}?orgId={orgId}", HttpMethod.GET, null,
                RoomInfo.class, roomId, orgId).getBody();
        } catch (HttpClientErrorException.NotFound notFound) {
            return null;
        } catch (RestClientException ex) {
            throw new AppException(ErrorCode.FACILITY_UNAVAILABLE);
        }
    }

    public List<RoomInfo> rooms(String orgId, String departmentId) {
        try {
            var response = http.exchange(
                "/internal/rooms?orgId={orgId}&departmentId={departmentId}", HttpMethod.GET, null,
                new ParameterizedTypeReference<List<RoomInfo>>() {}, orgId, departmentId);
            return response.getBody() == null ? List.of() : response.getBody();
        } catch (RestClientException ex) {
            throw new AppException(ErrorCode.FACILITY_UNAVAILABLE);
        }
    }

    /** Phòng của toàn tổ chức (mọi phòng ban) — phòng là tài nguyên cấp org. */
    public List<RoomInfo> roomsOfOrg(String orgId) {
        try {
            var response = http.exchange(
                "/internal/rooms?orgId={orgId}", HttpMethod.GET, null,
                new ParameterizedTypeReference<List<RoomInfo>>() {}, orgId);
            return response.getBody() == null ? List.of() : response.getBody();
        } catch (RestClientException ex) {
            throw new AppException(ErrorCode.FACILITY_UNAVAILABLE);
        }
    }
}
