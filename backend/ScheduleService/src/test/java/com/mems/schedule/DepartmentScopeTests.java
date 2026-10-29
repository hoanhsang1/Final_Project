package com.mems.schedule;
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
        jdbc.update("DELETE FROM session");jdbc.update("DELETE FROM class");
        jdbc.update("INSERT INTO class(id,org_id) VALUES ('class-a','org-a'),('class-b','org-b')");
        jdbc.update("INSERT INTO session(id,class_id,department_id,teacher_id,start_time,end_time,status) VALUES "+
            "('item-a','class-a','dept-a','teacher',CURRENT_TIMESTAMP,DATEADD('HOUR',1,CURRENT_TIMESTAMP),'scheduled'),"+
            "('item-b','class-b','dept-a','teacher',CURRENT_TIMESTAMP,DATEADD('HOUR',1,CURRENT_TIMESTAMP),'scheduled'),"+
            "('item-c','class-a','dept-b','teacher',CURRENT_TIMESTAMP,DATEADD('HOUR',1,CURRENT_TIMESTAMP),'scheduled'),"+
            "('item-unassigned','class-a',NULL,'teacher',CURRENT_TIMESTAMP,DATEADD('HOUR',1,CURRENT_TIMESTAMP),'scheduled')");
    }
    @Test void noTokenReturns401() throws Exception {
        mvc.perform(get("/departments/dept-a/schedules")).andExpect(status().isUnauthorized());
    }
    @Test void wrongPermissionReturns403() throws Exception {
        mvc.perform(get("/departments/dept-a/schedules").with(jwt().jwt(j -> j.subject("staff")
            .claim("orgId","org-a").claim("departmentId","dept-a"))
            .authorities(new SimpleGrantedAuthority("PEOPLE_VIEW")))).andExpect(status().isForbidden());
    }
    @Test void differentDepartmentReturns403() throws Exception {
        mvc.perform(get("/departments/dept-b/schedules").with(jwt().jwt(j -> j.subject("staff")
            .claim("orgId","org-a").claim("departmentId","dept-a"))
            .authorities(new SimpleGrantedAuthority("SCHEDULE_VIEW")))).andExpect(status().isForbidden());
    }
    @Test void departmentQueryExcludesOtherOrganizationsAndUnassignedData() throws Exception {
        mvc.perform(get("/departments/dept-a/schedules").with(jwt().jwt(j -> j.subject("staff")
            .claim("orgId","org-a").claim("departmentId","dept-a"))
            .authorities(new SimpleGrantedAuthority("SCHEDULE_VIEW")))).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].id").value("item-a"));
    }
    @Test void ownerStillQueriesOnlyOwnOrganization() throws Exception {
        mvc.perform(get("/departments/dept-a/schedules").with(jwt().jwt(j -> j.subject("owner").claim("orgId","org-a"))
            .authorities(new SimpleGrantedAuthority("ROLE_OWNER")))).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1));
    }
    @Test void temporaryPasswordTokenIsBlocked() throws Exception {
        mvc.perform(get("/departments/dept-a/schedules").with(jwt().jwt(j -> j.subject("staff")
            .claim("orgId","org-a").claim("departmentId","dept-a").claim("mustChangePassword",true))
            .authorities(new SimpleGrantedAuthority("SCHEDULE_VIEW")))).andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("PASSWORD_CHANGE_REQUIRED"));
    }
    @Test void openApiCanBeReadWithoutToken() throws Exception {
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
            .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.scheme").value("bearer"));
    }
}
