package com.mems.client;

import com.mems.exception.ApiException;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.List;

/** Đọc lớp/môn/giáo viên từ PeopleService qua API nội bộ. */
@Component
public class PeopleClient {
    private final RestTemplate http;

    public PeopleClient(RestTemplateBuilder builder, Environment env) {
        http = builder.rootUri(env.getProperty("people.service.url", "http://localhost:8082"))
            .defaultHeader("X-Internal-Api-Key", env.getProperty("internal.api.key", ""))
            .setConnectTimeout(Duration.ofSeconds(3))
            .setReadTimeout(Duration.ofSeconds(5))
            .build();
    }

    /** Trả {@code null} khi lớp không tồn tại trong tổ chức. */
    public ClassInfo classInfo(String orgId, String classId) {
        try {
            return http.exchange("/internal/classes/{classId}?orgId={orgId}", HttpMethod.GET, null,
                ClassInfo.class, classId, orgId).getBody();
        } catch (HttpClientErrorException.NotFound ex) {
            return null;
        } catch (RestClientException ex) {
            throw unavailable(ex);
        }
    }

    /** Tất cả môn của lớp (chương trình + nhập tay); trả danh sách rỗng nếu chưa có. */
    public List<ClassSubjectInfo> classSubjects(String orgId, String classId) {
        try {
            var response = http.exchange("/internal/classes/{classId}/subjects?orgId={orgId}",
                HttpMethod.GET, null, new ParameterizedTypeReference<List<ClassSubjectInfo>>() {},
                classId, orgId);
            return response.getBody() == null ? List.of() : response.getBody();
        } catch (RestClientException ex) {
            throw unavailable(ex);
        }
    }

    /** Nguồn duy nhất xác định giáo viên đủ điều kiện theo D1. */
    public List<EligibleTeacherInfo> eligibleTeachers(String orgId, String subjectId) {
        try {
            var response = http.exchange(
                "/internal/teachers/eligible?orgId={orgId}&subjectId={subjectId}",
                HttpMethod.GET, null, new ParameterizedTypeReference<List<EligibleTeacherInfo>>() {},
                orgId, subjectId);
            return response.getBody() == null ? List.of() : response.getBody();
        } catch (RestClientException ex) {
            throw unavailable(ex);
        }
    }

    private ApiException unavailable(RestClientException cause) {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "PEOPLE_UNAVAILABLE",
            "Không thể lấy dữ liệu từ PeopleService: " + cause.getMessage());
    }
}
