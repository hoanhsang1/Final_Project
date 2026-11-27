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
import java.util.Collection;
import java.util.List;
import java.util.Map;

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

    /** Batch giáo viên đủ điều kiện cho nhiều môn; mỗi subjectId luôn có key (có thể rỗng). */
    public Map<String, List<EligibleTeacherInfo>> eligibleTeachersBatch(String orgId,
                                                                       Collection<String> subjectIds) {
        if (subjectIds == null || subjectIds.isEmpty()) return Map.of();
        try {
            var response = http.exchange(
                "/internal/subjects/eligible-teachers?orgId={orgId}&subjectIds={subjectIds}",
                HttpMethod.GET, null,
                new ParameterizedTypeReference<Map<String, List<EligibleTeacherInfo>>>() {},
                orgId, String.join(",", subjectIds));
            return response.getBody() == null ? Map.of() : response.getBody();
        } catch (RestClientException ex) {
            throw new AppException(ErrorCode.PEOPLE_UNAVAILABLE);
        }
    }

    /** Danh sách tất cả môn học của lớp (cả môn chính và môn thêm thủ công / CTĐT). */
    public List<ClassSubjectInfo> classSubjects(String orgId, String classId) {
        try {
            var response = http.exchange(
                "/internal/classes/{classId}/subjects?orgId={orgId}",
                HttpMethod.GET, null, new ParameterizedTypeReference<List<ClassSubjectInfo>>() {},
                classId, orgId);
            return response.getBody() == null ? List.of() : response.getBody();
        } catch (Exception ex) {
            return List.of();
        }
    }

    /** Giáo viên có tồn tại trong tổ chức không; 404 nghĩa là không thuộc org. */
    public boolean teacherExists(String orgId, String teacherId) {
        return teacherInfo(orgId, teacherId) != null;
    }

    /** Trả `null` khi giáo viên không tồn tại trong tổ chức. */
    public EligibleTeacherInfo teacherInfo(String orgId, String teacherId) {
        try {
            return http.exchange("/internal/teachers/{teacherId}?orgId={orgId}", HttpMethod.GET, null,
                EligibleTeacherInfo.class, teacherId, orgId).getBody();
        } catch (HttpClientErrorException.NotFound notFound) {
            return null;
        } catch (RestClientException ex) {
            throw new AppException(ErrorCode.PEOPLE_UNAVAILABLE);
        }
    }
}
