package com.mems.security;

import com.mems.config.CorsConfig;
import com.mems.controller.SchoolClassController;
import com.mems.dto.SchoolClassResponse;
import com.mems.service.ClassStatusService;
import com.mems.service.SchoolClassService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = SchoolClassController.class)
@Import({SecurityConfig.class, CorsConfig.class})
class ClassLifecyclePermissionTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SchoolClassService service;

    @MockBean
    private ClassStatusService statusService;

    @Test
    @DisplayName("Các thao tác vòng đời lớp thiếu quyền đều trả 403")
    void lifecycleEndpointsRequireTheirPermission() throws Exception {
        assertForbidden("/classes/class-1/cancel", "{\"reason\":\"Lý do\",\"version\":0}", "CLASS_VIEW");
        assertForbidden("/classes/class-1/close-requests", "{}", "CLASS_VIEW");
        assertForbidden("/classes/class-1/close-requests/approve", null, "CLASS_CLOSE_REQUEST");
        assertForbidden("/classes/class-1/close-requests/reject",
            "{\"reason\":\"Lý do\"}", "CLASS_CLOSE_REQUEST");
        assertForbidden("/classes/class-1/reopen", "{}", "CLASS_CLOSE_REQUEST");
    }

    @Test
    @DisplayName("Đủ quyền thì gọi được các thao tác vòng đời lớp")
    void lifecycleEndpointsAllowTheirPermission() throws Exception {
        SchoolClassResponse response = new SchoolClassResponse("class-1", "org-1", "C001", "Class 1",
            "2026", LocalDate.now(), null, "CHUA_BAT_DAU", null, "NONE", 1, 0, "owner", Instant.now(), null);
        when(statusService.cancel(eq("class-1"), any())).thenReturn(response);
        when(statusService.requestClose(eq("class-1"), any())).thenReturn(response);
        when(statusService.approveClose("class-1")).thenReturn(response);
        when(statusService.rejectClose(eq("class-1"), any())).thenReturn(response);
        when(statusService.reopen(eq("class-1"), any())).thenReturn(response);

        mockMvc.perform(post("/classes/class-1/cancel")
                .with(jwt().authorities(new SimpleGrantedAuthority("CLASS_CANCEL")))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"Lý do\",\"version\":0}"))
            .andExpect(status().isOk());
        mockMvc.perform(post("/classes/class-1/close-requests")
                .with(jwt().authorities(new SimpleGrantedAuthority("CLASS_CLOSE_REQUEST")))
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isOk());
        mockMvc.perform(post("/classes/class-1/close-requests/approve")
                .with(jwt().authorities(new SimpleGrantedAuthority("CLASS_CLOSE_APPROVE"))))
            .andExpect(status().isOk());
        mockMvc.perform(post("/classes/class-1/close-requests/reject")
                .with(jwt().authorities(new SimpleGrantedAuthority("CLASS_CLOSE_APPROVE")))
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Lý do\"}"))
            .andExpect(status().isOk());
        mockMvc.perform(post("/classes/class-1/reopen")
                .with(jwt().authorities(new SimpleGrantedAuthority("CLASS_REOPEN")))
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isOk());
    }

    private void assertForbidden(String path, String body, String permission) throws Exception {
        var request = post(path)
            .with(jwt().authorities(new SimpleGrantedAuthority(permission)));
        if (body != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        mockMvc.perform(request).andExpect(status().isForbidden());
    }
}
