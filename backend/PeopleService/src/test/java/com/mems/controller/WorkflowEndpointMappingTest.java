package com.mems.controller;

import com.mems.client.IdentityClient;
import com.mems.repository.MemberRepository;
import com.mems.security.Actor;
import com.mems.service.ClassApprovalPolicy;
import com.mems.service.ClassStatusService;
import com.mems.service.EffectivePermissionsService;
import com.mems.service.NotificationService;
import com.mems.service.ResignationApprovalPolicy;
import com.mems.service.ResignationService;
import com.mems.service.TransferService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Khoá đúng URL công khai của các endpoint tự phục vụ. Test này bắt lỗi
 * "controller có nhưng sai đường dẫn" — nguyên nhân 404 mà test service bỏ qua.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class WorkflowEndpointMappingTest {

    @Mock private Actor actor;
    @Mock private TransferService transfers;
    @Mock private NotificationService notifications;
    @Mock private ResignationService resignationService;
    @Mock private ResignationApprovalPolicy resignationPolicy;
    @Mock private ClassApprovalPolicy classes;
    @Mock private ClassStatusService classStatus;
    @Mock private MemberRepository members;
    @Mock private EffectivePermissionsService effectivePermissions;
    @Mock private IdentityClient identity;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(
            new TransferController(transfers),
            new NotificationController(notifications),
            new ApprovalCapabilityController(actor, transfers, resignationService,
                resignationPolicy, classes, classStatus),
            new EffectivePermissionController(actor, members, effectivePermissions, identity)
        ).build();

        when(actor.orgId()).thenReturn("org-1");
        when(actor.userId()).thenReturn("user-1");
        when(transfers.inbox()).thenReturn(List.of());
        when(notifications.mine()).thenReturn(List.of());
        when(transfers.canDecideAny()).thenReturn(true);
        when(resignationPolicy.canApproveAny("org-1")).thenReturn(false);
        when(classes.canApprove("org-1")).thenReturn(false);
        when(resignationService.inbox(null)).thenReturn(List.of());
        when(classStatus.approvalInbox()).thenReturn(List.of());
        when(members.findDepartmentId("user-1", "org-1")).thenReturn(Optional.of("dept-1"));
        when(effectivePermissions.resolve("org-1", "user-1", "dept-1"))
            .thenReturn(new EffectivePermissionsService.EffectivePermissions(
                Set.of("employee.view"),
                Map.of("employee.view", Set.of("DEPARTMENT:dept-1"))));
    }

    @Test
    void transferInboxIsMapped() throws Exception {
        mvc.perform(get("/transfer-requests/inbox"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    @Test
    void notificationsIsMapped() throws Exception {
        mvc.perform(get("/notifications"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    @Test
    void approvalCapabilitiesIsMapped() throws Exception {
        mvc.perform(get("/users/me/approval-capabilities"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.transfer").value(true))
            .andExpect(jsonPath("$.any").value(true));
    }

    @Test
    void approvalInboxIsMapped() throws Exception {
        mvc.perform(get("/users/me/approval-inbox"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.transfers").isArray())
            .andExpect(jsonPath("$.resignations").isArray())
            .andExpect(jsonPath("$.classLifecycle").isArray())
            .andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void effectivePermissionsIsMapped() throws Exception {
        mvc.perform(get("/users/me/permissions"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.userId").value("user-1"))
            .andExpect(jsonPath("$.departmentId").value("dept-1"))
            .andExpect(jsonPath("$.permissions[0]").value("employee.view"));
    }
}
