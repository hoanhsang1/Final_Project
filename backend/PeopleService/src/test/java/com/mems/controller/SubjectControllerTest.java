package com.mems.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mems.config.CorsConfig;
import com.mems.dto.*;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.security.Actor;
import com.mems.security.SecurityConfig;
import com.mems.service.SubjectService;
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
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = SubjectController.class)
@Import({SecurityConfig.class, CorsConfig.class})
class SubjectControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private SubjectService service;

    @MockBean
    private Actor actor;

    private SubjectResponse sampleSubject(String id, String code, String name) {
        return new SubjectResponse(id, code, name, "Mô tả", true, Instant.now(), null);
    }

    @Test
    @DisplayName("GET /subjects không có token -> 401 UNAUTHENTICATED")
    void listWithoutTokenReturns401() throws Exception {
        mockMvc.perform(get("/subjects"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    @DisplayName("GET /subjects với quyền class.view -> 403 FORBIDDEN (D-05: không kế thừa quyền từ class.view)")
    void listWithClassViewReturns403() throws Exception {
        mockMvc.perform(get("/subjects")
                .with(jwt().authorities(new SimpleGrantedAuthority("class.view"))))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("GET /subjects với quyền student.view -> 403 FORBIDDEN (D-05: không kế thừa quyền từ student.view)")
    void listWithStudentViewReturns403() throws Exception {
        mockMvc.perform(get("/subjects")
                .with(jwt().authorities(new SimpleGrantedAuthority("student.view"))))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("GET /subjects với quyền subject.view -> 200 OK trả array")
    void listWithSubjectViewReturns200() throws Exception {
        when(service.list(any(), eq(false))).thenReturn(List.of(sampleSubject("sub-1", "TOAN", "Toán")));

        mockMvc.perform(get("/subjects")
                .with(jwt().authorities(new SimpleGrantedAuthority("subject.view"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value("sub-1"))
            .andExpect(jsonPath("$[0].code").value("TOAN"));
    }

    @Test
    @DisplayName("GET /subjects với role OWNER -> 200 OK")
    void listWithOwnerReturns200() throws Exception {
        when(service.list(any(), eq(false))).thenReturn(List.of(sampleSubject("sub-1", "TOAN", "Toán")));

        mockMvc.perform(get("/subjects")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_OWNER"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value("sub-1"));
    }

    @Test
    @DisplayName("POST /subjects với quyền subject.view -> 403 FORBIDDEN")
    void createWithSubjectViewReturns403() throws Exception {
        SubjectRequest req = new SubjectRequest("TOAN", "Toán", null);

        mockMvc.perform(post("/subjects")
                .with(jwt().authorities(new SimpleGrantedAuthority("subject.view")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /subjects với quyền subject.manage -> 201 Created")
    void createWithSubjectManageReturns201() throws Exception {
        SubjectRequest req = new SubjectRequest("TOAN10", "Toán 10", "Đại số");
        SubjectResponse resp = sampleSubject("sub-1", "TOAN10", "Toán 10");
        when(service.create(any())).thenReturn(resp);

        mockMvc.perform(post("/subjects")
                .with(jwt().authorities(new SimpleGrantedAuthority("subject.manage")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value("sub-1"))
            .andExpect(jsonPath("$.code").value("TOAN10"));
    }

    @Test
    @DisplayName("POST /subjects thiếu name -> 400 NAME_REQUIRED")
    void createWithoutNameReturns400() throws Exception {
        SubjectRequest req = new SubjectRequest("TOAN", "   ", null);

        mockMvc.perform(post("/subjects")
                .with(jwt().authorities(new SimpleGrantedAuthority("subject.manage")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("NAME_REQUIRED"));
    }

    @Test
    @DisplayName("GET /subjects/check-code với mã hợp lệ -> 200 OK")
    void checkCodeReturns200() throws Exception {
        when(service.checkCode(eq("TOAN10"), any())).thenReturn(new SubjectCodeCheckResponse("TOAN10", true, null));

        mockMvc.perform(get("/subjects/check-code")
                .param("code", "TOAN10")
                .with(jwt().authorities(new SimpleGrantedAuthority("subject.manage"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value("TOAN10"))
            .andExpect(jsonPath("$.available").value(true));
    }

    @Test
    @DisplayName("GET /subjects/{id}/usage -> 200 OK")
    void getUsageReturns200() throws Exception {
        when(service.getUsage("sub-1")).thenReturn(new SubjectUsageResponse("sub-1", 0, List.of()));

        mockMvc.perform(get("/subjects/sub-1/usage")
                .with(jwt().authorities(new SimpleGrantedAuthority("subject.view"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.subjectId").value("sub-1"))
            .andExpect(jsonPath("$.classesUsingSubject").value(0));
    }

    @Test
    @DisplayName("PATCH /subjects/{id}/status -> 200 OK")
    void updateStatusReturns200() throws Exception {
        SubjectStatusRequest req = new SubjectStatusRequest(false);
        when(service.updateStatus(eq("sub-1"), any())).thenReturn(sampleSubject("sub-1", "TOAN", "Toán"));

        mockMvc.perform(patch("/subjects/sub-1/status")
                .with(jwt().authorities(new SimpleGrantedAuthority("subject.manage")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isOk());
    }
}
