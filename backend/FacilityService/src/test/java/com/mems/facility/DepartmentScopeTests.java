package com.mems.facility;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class DepartmentScopeTests {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @BeforeEach void fixtures() {
        jdbc.update("DELETE FROM classroom");
        jdbc.update("INSERT INTO classroom(id,org_id,department_id,code,name,capacity,status) VALUES " +
            "('item-a','org-a','dept-a','A','Room A',30,'active')," +
            "('item-b','org-b','dept-a','B','Room B',30,'active')," +
            "('item-c','org-a','dept-b','C','Room C',30,'active')," +
            "('item-unassigned','org-a',NULL,'D','Unassigned',30,'active')");
    }
    @Test void noTokenReturns401() throws Exception {
        mvc.perform(get("/departments/dept-a/facilities")).andExpect(status().isUnauthorized());
    }
    @Test void wrongPermissionReturns403() throws Exception {
        mvc.perform(get("/departments/dept-a/facilities").with(jwt().jwt(j -> j.subject("staff")
            .claim("orgId","org-a").claim("departmentId","dept-a"))
            .authorities(new SimpleGrantedAuthority("PEOPLE_VIEW")))).andExpect(status().isForbidden());
    }
    @Test void differentDepartmentReturns403() throws Exception {
        mvc.perform(get("/departments/dept-b/facilities").with(jwt().jwt(j -> j.subject("staff")
            .claim("orgId","org-a").claim("departmentId","dept-a"))
            .authorities(new SimpleGrantedAuthority("FACILITY_MANAGE")))).andExpect(status().isForbidden());
    }
    @Test void departmentQueryExcludesOtherOrganizationsAndUnassignedData() throws Exception {
        mvc.perform(get("/departments/dept-a/facilities").with(jwt().jwt(j -> j.subject("staff")
            .claim("orgId","org-a").claim("departmentId","dept-a"))
            .authorities(new SimpleGrantedAuthority("FACILITY_MANAGE")))).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].id").value("item-a"));
    }
    @Test void ownerStillQueriesOnlyOwnOrganization() throws Exception {
        mvc.perform(get("/departments/dept-a/facilities").with(jwt().jwt(j -> j.subject("owner").claim("orgId","org-a"))
            .authorities(new SimpleGrantedAuthority("ROLE_OWNER")))).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1));
    }
    @Test void temporaryPasswordTokenIsBlocked() throws Exception {
        mvc.perform(get("/departments/dept-a/facilities").with(jwt().jwt(j -> j.subject("staff")
            .claim("orgId","org-a").claim("departmentId","dept-a").claim("mustChangePassword",true))
            .authorities(new SimpleGrantedAuthority("FACILITY_MANAGE")))).andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("PASSWORD_CHANGE_REQUIRED"));
    }
    @Test void openApiCanBeReadWithoutToken() throws Exception {
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
            .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.scheme").value("bearer"));
    }
}
