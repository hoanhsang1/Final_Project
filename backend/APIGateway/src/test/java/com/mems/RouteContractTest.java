package com.mems;

import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Bảo vệ bảng route của gateway: thêm endpoint mới mà quên route sẽ khiến
 * trình duyệt nhận 404 ngay tại gateway dù service đã có mapping.
 */
class RouteContractTest {

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> routes() {
        try (InputStream in = RouteContractTest.class.getClassLoader().getResourceAsStream("application.yml")) {
            assertThat(in).as("application.yml phải nằm trong classpath").isNotNull();
            Map<String, Object> root = new Yaml().load(in);
            Map<String, Object> spring = (Map<String, Object>) root.get("spring");
            Map<String, Object> cloud = (Map<String, Object>) spring.get("cloud");
            Map<String, Object> gateway = (Map<String, Object>) cloud.get("gateway");
            return (List<Map<String, Object>>) gateway.get("routes");
        } catch (Exception e) {
            throw new IllegalStateException("Không đọc được cấu hình route của gateway", e);
        }
    }

    private static Map<String, Object> route(String id) {
        return routes().stream()
            .filter(r -> id.equals(r.get("id")))
            .findFirst()
            .orElseThrow(() -> new AssertionError("Thiếu route gateway: " + id));
    }

    @SuppressWarnings("unchecked")
    private static List<String> predicates(String id) {
        return (List<String>) route(id).get("predicates");
    }

    private static boolean hasPath(String id, String expected) {
        return predicates(id).stream().anyMatch(p -> p.equals("Path=" + expected));
    }

    @Test
    void plainPathRoutesExistWithoutStrippingPrefix() {
        assertThat(hasPath("people-users", "/users/**,/users,/users/")).isTrue();
        assertThat(hasPath("people-transfer-requests", "/transfer-requests/**,/transfer-requests,/transfer-requests/")).isTrue();
        assertThat(hasPath("people-notifications", "/notifications/**,/notifications,/notifications/")).isTrue();
        assertThat(hasPath("people-permission-bundles", "/permission-bundles/**,/permission-bundles,/permission-bundles/")).isTrue();
        assertThat(hasPath("identity-modules", "/api/v1/modules/**,/api/v1/modules")).isTrue();

        assertThat(route("people-users").get("filters")).as("route /users không được StripPrefix").isNull();
        assertThat(route("people-transfer-requests").get("filters")).isNull();
        assertThat(route("people-notifications").get("filters")).isNull();
        assertThat(route("identity-modules").get("filters")).isNull();
    }

    @Test
    @SuppressWarnings("unchecked")
    void sprint4ApiRoutesStripOnlyApiSegment() {
        List<String> stripIds = List.of(
            "people-teachers-api",
            "people-specialties-api",
            "people-subjects-api",
            "people-classes-api",
            "people-transfer-requests-api",
            "people-notifications-api",
            "people-delegations-api",
            "people-general-manager-api",
            "people-audit-logs-api"
        );
        for (String id : stripIds) {
            List<String> filters = (List<String>) route(id).get("filters");
            assertThat(filters).as("%s phải có StripPrefix=1", id).containsExactly("StripPrefix=1");
        }
        assertThat(hasPath("people-audit-logs-api", "/api/audit-logs/**,/api/audit-logs")).isTrue();
    }

    @Test
    void everyRouteHasIdUriAndPredicates() {
        List<String> broken = routes().stream()
            .filter(r -> !(r.get("id") instanceof String) || r.get("uri") == null || r.get("predicates") == null)
            .map(String::valueOf)
            .collect(Collectors.toList());
        assertThat(broken).as("route thiếu id/uri/predicates").isEmpty();
    }
}
