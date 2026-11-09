package com.mems.security;

import com.mems.config.CorsConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PermissionProbeController.class)
@Import({SecurityConfig.class, CorsConfig.class})
class PermissionEnforcementTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Không có token: 401 UNAUTHENTICATED")
    void missingTokenReturns401() throws Exception {
        mockMvc.perform(get("/test/class-assignment"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    @DisplayName("Token thiếu CLASS_ASSIGN_TEACHER: 403 FORBIDDEN")
    void tokenWithoutNewPermissionReturns403() throws Exception {
        mockMvc.perform(get("/test/class-assignment")
                .with(jwt().authorities(new SimpleGrantedAuthority("CLASS_VIEW"))))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("Token có CLASS_ASSIGN_TEACHER: được phép")
    void tokenWithNewPermissionIsAllowed() throws Exception {
        mockMvc.perform(get("/test/class-assignment")
                .with(jwt().authorities(new SimpleGrantedAuthority("CLASS_ASSIGN_TEACHER"))))
            .andExpect(status().isOk());
    }
}
