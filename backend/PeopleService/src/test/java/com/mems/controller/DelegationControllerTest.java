package com.mems.controller;

import com.mems.config.CorsConfig;
import com.mems.dto.DelegationResponse;
import com.mems.service.DelegationService;
import com.mems.service.GeneralManagerService;
import com.mems.security.SecurityConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {DelegationController.class, GeneralManagerController.class})
@Import({SecurityConfig.class, CorsConfig.class})
class DelegationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DelegationService delegations;

    @MockBean
    private GeneralManagerService generalManagers;

    private DelegationResponse delegation() {
        return new DelegationResponse("del-1", "owner-1", "Owner", "gm-1", "Tổng quản lý",
            "gm", "dept-1", "Phòng ban", Set.of("employee.view"), "ORGANIZATION",
            Instant.now(), null, "ACTIVE", true, "Lý do", Instant.now(), null, null);
    }

    @Test
    @DisplayName("Owner xem được danh sách ủy quyền")
    void ownerCanListDelegations() throws Exception {
        when(delegations.list(anyBoolean())).thenReturn(List.of(delegation()));

        mockMvc.perform(get("/delegations")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_OWNER"))
                    .jwt(j -> j.claim("orgId", "org-1"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value("del-1"));
    }

    @Test
    @DisplayName("Không phải Owner: 403 khi quản lý ủy quyền")
    void nonOwnerCannotListDelegations() throws Exception {
        mockMvc.perform(get("/delegations")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_STAFF"))
                    .jwt(j -> j.claim("orgId", "org-1"))))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Tổng quản lý xem được quyền ủy quyền của chính mình")
    void delegateCanReadOwnDelegations() throws Exception {
        when(delegations.mine()).thenReturn(List.of(delegation()));

        mockMvc.perform(get("/delegations/me")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_STAFF"))
                    .jwt(j -> j.claim("orgId", "org-1"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].permissions[0]").value("employee.view"));
    }
}
