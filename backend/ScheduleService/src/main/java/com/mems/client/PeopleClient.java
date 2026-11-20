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

/** Đọc lớp/giáo viên/học sinh từ PeopleService qua API nội bộ. */
@Component
public class PeopleClient {
    private final RestTemplate http;

    public PeopleClient(RestTemplateBuilder builder, Environment env) {
        http = builder.rootUri(env.getProperty("PEOPLE_SERVICE_URL", "http://localhost:8082"))
            .defaultHeader("X-Internal-Api-Key", env.getProperty("INTERNAL_API_KEY", ""))
            .setConnectTimeout(Duration.ofSeconds(3))
            .setReadTimeout(Duration.ofSeconds(5))
            .build();
    }

    /** Trả `null` khi lớp không tồn tại trong tổ chức. */
    public ClassInfo classInfo(String orgId, String classId) {
        try {
            return http.exchange("/internal/classes/{classId}?orgId={orgId}", HttpMethod.GET, null,
                ClassInfo.class, classId, orgId).getBody();
        } catch (HttpClientErrorException.NotFound notFound) {
            return null;
        } catch (RestClientException ex) {
            throw new AppException(ErrorCode.PEOPLE_UNAVAILABLE);
        }
    }

    public List<StudentClass> studentClasses(String orgId, String studentId) {
        try {
            var response = http.exchange("/internal/students/{studentId}/classes?orgId={orgId}",
                HttpMethod.GET, null, new ParameterizedTypeReference<List<StudentClass>>() {},
                studentId, orgId);
            return response.getBody() == null ? List.of() : response.getBody();
        } catch (RestClientException ex) {
            throw new AppException(ErrorCode.PEOPLE_UNAVAILABLE);
        }
    }

    /** Danh sách giáo viên đủ điều kiện dạy subjectId trong org. */
    public List<EligibleTeacherInfo> eligibleTeachers(String orgId, String subjectId) {
        try {
            var response = http.exchange(
                "/internal/teachers/eligible?orgId={orgId}&subjectId={subjectId}",
                HttpMethod.GET, null, new ParameterizedTypeReference<List<EligibleTeacherInfo>>() {},
                orgId, subjectId);
            return response.getBody() == null ? List.of() : response.getBody();
        } catch (RestClientException ex) {
            throw new AppException(ErrorCode.PEOPLE_UNAVAILABLE);
        }
    }
}
