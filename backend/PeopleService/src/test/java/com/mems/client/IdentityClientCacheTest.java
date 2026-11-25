package com.mems.client;

import com.mems.exception.AppException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/** CC-01: metadata Identity được cache ngắn hạn, lỗi không bị cache. */
class IdentityClientCacheTest {

    private MockRestServiceServer server;
    private IdentityClient client;

    @BeforeEach
    void setUp() {
        RestTemplate rest = new RestTemplateBuilder()
            .rootUri("http://localhost:8081")
            .build();
        server = MockRestServiceServer.bindTo(rest).build();
        client = new IdentityClient(rest);
    }

    @Test
    @DisplayName("Gọi activeModules hai lần chỉ tạo một request Identity")
    void activeModulesIsCached() {
        server.expect(requestTo("http://localhost:8081/internal/orgs/org-1/modules"))
            .andRespond(withSuccess("[\"STUDENT_MANAGEMENT\"]", MediaType.APPLICATION_JSON));

        assertThat(client.activeModules("org-1")).containsExactly("STUDENT_MANAGEMENT");
        assertThat(client.activeModules("org-1")).containsExactly("STUDENT_MANAGEMENT");

        server.verify();
    }

    @Test
    @DisplayName("Module status được cache theo từng tổ chức")
    void moduleStatusIsCachedPerOrganization() {
        server.expect(requestTo("http://localhost:8081/internal/orgs/org-1/modules/status"))
            .andRespond(withSuccess("[{\"code\":\"STUDENT_MANAGEMENT\",\"status\":\"active\"}]",
                MediaType.APPLICATION_JSON));
        server.expect(requestTo("http://localhost:8081/internal/orgs/org-2/modules/status"))
            .andRespond(withSuccess("[{\"code\":\"STUDENT_MANAGEMENT\",\"status\":\"disabled\"}]",
                MediaType.APPLICATION_JSON));

        assertThat(client.moduleStatus("org-1").get(0).get("status")).isEqualTo("active");
        assertThat(client.moduleStatus("org-1").get(0).get("status")).isEqualTo("active");
        assertThat(client.moduleStatus("org-2").get(0).get("status")).isEqualTo("disabled");

        server.verify();
    }

    @Test
    @DisplayName("Lỗi Identity không bị cache: lần sau gọi lại và thành công")
    void failuresAreNotCached() {
        server.expect(requestTo("http://localhost:8081/internal/permissions"))
            .andRespond(withServerError());
        server.expect(requestTo("http://localhost:8081/internal/permissions"))
            .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        assertThatThrownBy(client::permissions).isInstanceOf(AppException.class);
        assertThat(client.permissions()).isEmpty();

        server.verify();
    }
}
