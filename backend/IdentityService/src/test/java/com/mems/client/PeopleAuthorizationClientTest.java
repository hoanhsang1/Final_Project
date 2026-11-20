package com.mems.client;

import com.mems.dto.AccessProfile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/** AUTH-11: đăng nhập vẫn hoạt động khi PeopleService không sẵn sàng, không fail-open. */
class PeopleAuthorizationClientTest {

    private static final String URL = "http://people/internal/users/u1/authorization?orgId=org-1";
    private static final String BODY = """
        {"role":"STAFF","departmentId":"dept-1","permissions":["employee.view"],
         "permissionScopes":{"employee.view":["DEPARTMENT:dept-1"]},"delegatedPermissions":[]}
        """;

    private MockRestServiceServer server;
    private AtomicLong clock;
    private PeopleAuthorizationClient client;

    @BeforeEach
    void setUp() {
        RestTemplate http = new RestTemplateBuilder().rootUri("http://people").build();
        server = MockRestServiceServer.bindTo(http).build();
        clock = new AtomicLong(1_000_000);
        client = new PeopleAuthorizationClient(http,
            new AccessProfileCache(60_000, 600_000, clock::get));
    }

    private void respondOk() {
        server.expect(requestTo(URL)).andRespond(withSuccess(BODY, MediaType.APPLICATION_JSON));
    }

    private void respondDown() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));
    }

    @Test
    @DisplayName("People trả lời: hồ sơ được dùng và cache trong 60 giây")
    void resolvesAndCachesFreshProfile() {
        respondOk();

        AccessProfile first = client.resolve("u1", "org-1", "STAFF");
        clock.addAndGet(30_000);
        AccessProfile second = client.resolve("u1", "org-1", "STAFF");

        assertThat(first.role()).isEqualTo("STAFF");
        assertThat(first.permissions()).containsExactly("employee.view");
        assertThat(first.isStale()).isFalse();
        assertThat(second.permissions()).containsExactly("employee.view");
        server.verify();
    }

    @Test
    @DisplayName("People lỗi trong hạn cứng: dùng last-known-good và đánh dấu stale")
    void servesLastKnownGoodWithinHardLimit() {
        respondOk();
        respondDown();
        client.resolve("u1", "org-1", "STAFF");

        clock.addAndGet(120_000);

        AccessProfile stale = client.resolve("u1", "org-1", "STAFF");

        assertThat(stale.permissions()).containsExactly("employee.view");
        assertThat(stale.isStale()).isTrue();
    }

    @Test
    @DisplayName("People lỗi sau hạn cứng: hồ sơ RỖNG, không dùng snapshot cũ")
    void refusesSnapshotAfterHardLimit() {
        respondOk();
        respondDown();
        client.resolve("u1", "org-1", "STAFF");

        clock.addAndGet(700_000);

        AccessProfile empty = client.resolve("u1", "org-1", "STAFF");

        assertThat(empty.role()).isEqualTo("STAFF");
        assertThat(empty.permissions()).isEmpty();
        assertThat(empty.permissionScopes()).isEmpty();
        assertThat(empty.delegatedPermissions()).isEmpty();
        assertThat(empty.isStale()).isTrue();
    }

    @Test
    @DisplayName("People lỗi ngay từ đầu: hồ sơ rỗng nhưng vẫn có role tài khoản")
    void returnsEmptyProfileWhenNothingCached() {
        respondDown();

        AccessProfile profile = client.resolve("u1", "org-1", "MANAGER");

        assertThat(profile.role()).isEqualTo("MANAGER");
        assertThat(profile.permissions()).isEmpty();
        assertThat(profile.isStale()).isTrue();
    }

    @Test
    @DisplayName("Phản hồi sai role không phải MANAGER/STAFF bị coi là không xác minh được")
    void invalidRoleResponseIsTreatedAsUnavailable() {
        server.expect(requestTo(URL)).andRespond(withSuccess("""
            {"role":"OWNER","departmentId":null,"permissions":["employee.view"]}
            """, MediaType.APPLICATION_JSON));

        AccessProfile profile = client.resolve("u1", "org-1", "STAFF");

        assertThat(profile.permissions()).isEmpty();
        assertThat(profile.isStale()).isTrue();
    }
}
