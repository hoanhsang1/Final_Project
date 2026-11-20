package com.mems.security;

import com.mems.service.PeopleAuditService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerMapping;

import java.lang.reflect.Method;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class DelegationUsageInterceptorTest {
    private static final String AUDIT_ACTION = "DELEGATION_PERMISSION_USED";

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    /** Controller giả lập đủ 3 kiểu khai báo quyền mà interceptor đọc. */
    static class ProbeController {
        @DelegatedAction(permission = "employee.approve_resignation",
            resourceType = "RESIGNATION_REQUEST", resourceId = "requestId")
        public void approve(String requestId) {}

        @RequirePermission("employee.view")
        public void list() {}

        @PreAuthorize("hasRole('OWNER') or hasAuthority('class.assign_teacher')")
        public void assign(String classId) {}

        @DelegatedAction(permission = "employee.approve_transfer", resourceType = "TRANSFER_STEP")
        public void decide(String id) {}
    }

    private HandlerMethod handler(String name, Class<?>... parameters) throws Exception {
        Method method = ProbeController.class.getDeclaredMethod(name, parameters);
        return new HandlerMethod(new ProbeController(), method);
    }

    private Jwt jwt() {
        return Jwt.withTokenValue("token")
            .header("alg", "HS256")
            .claim("sub", "gm-1")
            .claim("orgId", "org-1")
            .claim("departmentId", "dept-1")
            .issuedAt(Instant.now().minusSeconds(60))
            .expiresAt(Instant.now().plusSeconds(600))
            .build();
    }

    private void authenticate() {
        SecurityContextHolder.getContext().setAuthentication(
            new JwtAuthenticationToken(jwt(), List.of(), "gm-1"));
    }

    private MockHttpServletRequest request() {
        var request = new MockHttpServletRequest("POST",
            "/departments/dept-1/resignation-requests/req-1/approve");
        request.setAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE, Map.of("requestId", "req-1"));
        return request;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> captureDetails(PeopleAuditService audit, String expectedTarget) {
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(audit).record(eq("org-1"), eq("gm-1"), eq(AUDIT_ACTION), eq(expectedTarget), captor.capture());
        return captor.getValue();
    }

    @Test
    @DisplayName("DEL-01: ghi đủ trường audit khi quyền ủy quyền được dùng thành công")
    void recordsAuditForDelegatedAction() throws Exception {
        var audit = mock(PeopleAuditService.class);
        authenticate();
        var request = request();
        request.setAttribute(DelegatedAuthorityFilter.GRANTS_ATTRIBUTE,
            Map.of("employee.approve_resignation", "delegation-1"));

        new DelegationUsageInterceptor(audit).afterCompletion(
            request, new MockHttpServletResponse(), handler("approve", String.class), null);

        Map<String, Object> details = captureDetails(audit, "delegation-1");
        assertThat(details)
            .containsEntry("permissionCode", "employee.approve_resignation")
            .containsEntry("delegationId", "delegation-1")
            .containsEntry("source", "DELEGATED")
            .containsEntry("resourceType", "RESIGNATION_REQUEST")
            .containsEntry("resourceId", "req-1")
            .containsEntry("organizationId", "org-1")
            .containsEntry("result", "SUCCESS")
            .containsEntry("action", "POST ProbeController.approve");
        assertThat(details).containsKey("timestamp");

        @SuppressWarnings("unchecked")
        var context = (Map<String, Object>) details.get("context");
        assertThat(context)
            .containsEntry("path", "/departments/dept-1/resignation-requests/req-1/approve")
            .containsEntry("departmentId", "dept-1");
    }

    @Test
    @DisplayName("DEL-01: không ghi audit khi quyền không đến từ ủy quyền")
    void skipsWhenPermissionIsNotDelegated() throws Exception {
        var audit = mock(PeopleAuditService.class);
        authenticate();
        var request = request();
        request.setAttribute(DelegatedAuthorityFilter.GRANTS_ATTRIBUTE,
            Map.of("employee.view", "delegation-9"));

        new DelegationUsageInterceptor(audit).afterCompletion(
            request, new MockHttpServletResponse(), handler("approve", String.class), null);

        verifyNoInteractions(audit);
    }

    @Test
    @DisplayName("DEL-01: response lỗi ⇒ không ghi audit dù quyền ủy quyền tồn tại")
    void skipsOnFailureResponse() throws Exception {
        var audit = mock(PeopleAuditService.class);
        authenticate();
        var request = request();
        request.setAttribute(DelegatedAuthorityFilter.GRANTS_ATTRIBUTE,
            Map.of("employee.approve_resignation", "delegation-1"));
        var response = new MockHttpServletResponse();
        response.setStatus(403);

        new DelegationUsageInterceptor(audit).afterCompletion(
            request, response, handler("approve", String.class), null);

        verifyNoInteractions(audit);
    }

    @Test
    @DisplayName("DEL-01: handler ném lỗi ⇒ không ghi audit")
    void skipsWhenHandlerThrows() throws Exception {
        var audit = mock(PeopleAuditService.class);
        authenticate();
        var request = request();
        request.setAttribute(DelegatedAuthorityFilter.GRANTS_ATTRIBUTE,
            Map.of("employee.approve_resignation", "delegation-1"));

        new DelegationUsageInterceptor(audit).afterCompletion(
            request, new MockHttpServletResponse(), handler("approve", String.class),
            new IllegalStateException("boom"));

        verifyNoInteractions(audit);
    }

    @Test
    @DisplayName("DEL-01: @RequirePermission được đối chiếu (không cần @DelegatedAction)")
    void recordsRequirePermissionUsage() throws Exception {
        var audit = mock(PeopleAuditService.class);
        authenticate();
        var request = new MockHttpServletRequest("GET", "/employees");
        request.setAttribute(DelegatedAuthorityFilter.GRANTS_ATTRIBUTE,
            Map.of("employee.view", "delegation-2"));

        new DelegationUsageInterceptor(audit).afterCompletion(
            request, new MockHttpServletResponse(), handler("list"), null);

        Map<String, Object> details = captureDetails(audit, "delegation-2");
        assertThat(details)
            .containsEntry("permissionCode", "employee.view")
            .containsEntry("resourceType", null)
            .containsEntry("resourceId", null);
    }

    @Test
    @DisplayName("DEL-01: @PreAuthorize lấy đúng mã quyền trong chuỗi hasAuthority")
    void recordsPreAuthorizeUsage() throws Exception {
        var audit = mock(PeopleAuditService.class);
        authenticate();
        var request = new MockHttpServletRequest("POST", "/classes/class-1/assign-teacher");
        request.setAttribute(DelegatedAuthorityFilter.GRANTS_ATTRIBUTE,
            Map.of("class.assign_teacher", "delegation-3"));

        new DelegationUsageInterceptor(audit).afterCompletion(
            request, new MockHttpServletResponse(), handler("assign", String.class), null);

        assertThat(captureDetails(audit, "delegation-3"))
            .containsEntry("permissionCode", "class.assign_teacher")
            .containsEntry("source", "DELEGATED");
    }

    @Test
    @DisplayName("DEL-01: @DelegatedAction không khai báo resourceId ⇒ resourceId null, không đoán")
    void delegatedActionWithoutResourceIdDoesNotGuess() throws Exception {
        var audit = mock(PeopleAuditService.class);
        authenticate();
        var request = request();
        request.setAttribute(DelegatedAuthorityFilter.GRANTS_ATTRIBUTE,
            Map.of("employee.approve_transfer", "delegation-4"));

        new DelegationUsageInterceptor(audit).afterCompletion(
            request, new MockHttpServletResponse(), handler("decide", String.class), null);

        assertThat(captureDetails(audit, "delegation-4"))
            .containsEntry("resourceType", "TRANSFER_STEP")
            .containsEntry("resourceId", null);
    }

    @Test
    @DisplayName("DEL-01: thiếu attribute grants ⇒ không ghi audit (không suy đoán từ JWT)")
    void skipsWithoutGrantAttribute() throws Exception {
        var audit = mock(PeopleAuditService.class);
        authenticate();

        new DelegationUsageInterceptor(audit).afterCompletion(
            request(), new MockHttpServletResponse(), handler("approve", String.class), null);

        verify(audit, never()).record(anyString(), anyString(), anyString(), anyString(), any());
    }

    @Test
    @DisplayName("DEL-01: lỗi ghi audit không được làm hỏng request đã xử lý")
    void auditFailureIsSwallowed() throws Exception {
        var audit = mock(PeopleAuditService.class);
        doThrow(new RuntimeException("db down")).when(audit)
            .record(anyString(), anyString(), anyString(), anyString(), any());
        authenticate();
        var request = request();
        request.setAttribute(DelegatedAuthorityFilter.GRANTS_ATTRIBUTE,
            Map.of("employee.approve_resignation", "delegation-1"));

        assertThatCode(() -> new DelegationUsageInterceptor(audit).afterCompletion(
            request, new MockHttpServletResponse(), handler("approve", String.class), null))
            .doesNotThrowAnyException();
    }
}
