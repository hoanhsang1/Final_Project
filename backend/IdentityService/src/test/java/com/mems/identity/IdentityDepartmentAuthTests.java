package com.mems.identity;

import com.fasterxml.jackson.databind.*;
import com.mems.client.PeopleAuthorizationClient;
import com.mems.config.IdentityDataInitializer;
import com.mems.dto.AccessProfile;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.cloud.netflix.eureka.EurekaClientAutoConfiguration;
import org.springframework.cloud.netflix.eureka.EurekaDiscoveryClientConfiguration;
import org.springframework.core.env.Environment;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.web.servlet.*;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@EnableAutoConfiguration(exclude = {
    EurekaClientAutoConfiguration.class,
    EurekaDiscoveryClientConfiguration.class
})
class IdentityDepartmentAuthTests {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired PasswordEncoder encoder;
    @Autowired JwtDecoder decoder;
    @Autowired Environment env;
    @MockBean PeopleAuthorizationClient people;
    static final String KEY="test-internal-key-at-least-thirty-two-characters";
    static final String PASSWORD="A-private-test-password-2026";

    @BeforeEach void fixtures() {
        jdbc.update("UPDATE refresh_token SET replaced_by=NULL");
        for(String table:List.of("refresh_token","account_role","account","organization")) jdbc.update("DELETE FROM "+table);
        jdbc.update("INSERT INTO organization VALUES ('org-a','Organization A','school','active')");
        createAccount("manager","MANAGER",false);
        when(people.resolve("manager","org-a")).thenReturn(new AccessProfile("MANAGER","dept-a",Set.of("PEOPLE_VIEW","PEOPLE_EDIT")));
    }
    void createAccount(String id,String role,boolean temporary) {
        jdbc.update("INSERT INTO account(id,org_id,username,email,password_hash,status,must_change_password) VALUES (?,'org-a',?,?,?,'active',?)",
            id,id,id+"@example.com",encoder.encode(PASSWORD),temporary);
        jdbc.update("INSERT INTO role(code,name,scope) VALUES (?,?,'organization') ON DUPLICATE KEY UPDATE name=VALUES(name)",role,role);
        jdbc.update("INSERT INTO account_role(account_id,role_id) SELECT ?,id FROM role WHERE code=?",id,role);
    }
    JsonNode login(String username) throws Exception {
        var result=mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of("username",username,"password",PASSWORD))))
            .andExpect(status().isOk()).andReturn();
        return json.readTree(result.getResponse().getContentAsString());
    }
    JsonNode refresh(String refreshToken) throws Exception {
        var result=mvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of("refreshToken",refreshToken))))
            .andExpect(status().isOk()).andReturn();
        return json.readTree(result.getResponse().getContentAsString());
    }
    @Test void loginIssuesExpectedClaimsAndShortLivedToken() throws Exception {
        var result=login("manager");
        var token=decoder.decode(result.get("accessToken").asText());
        assertThat(token.getSubject()).isEqualTo("manager");
        assertThat(token.getClaimAsString("userId")).isEqualTo("manager");
        assertThat(token.getClaimAsString("role")).isEqualTo("MANAGER");
        assertThat(token.getClaimAsString("orgId")).isEqualTo("org-a");
        assertThat(token.getClaimAsString("departmentId")).isEqualTo("dept-a");
        assertThat(token.getClaimAsStringList("permissions")).containsExactlyInAnyOrder("PEOPLE_VIEW","PEOPLE_EDIT");
        assertThat(token.getExpiresAt().getEpochSecond()-token.getIssuedAt().getEpochSecond()).isEqualTo(900);
        assertThat(result.get("expiresIn").asLong()).isEqualTo(900);
        assertThat(jdbc.queryForObject("SELECT token_hash FROM refresh_token",String.class))
            .hasSize(64).isNotEqualTo(result.get("refreshToken").asText());
    }
    @Test void refreshReadsChangedPermissionsAndRotatesToken() throws Exception {
        var first=login("manager");
        when(people.resolve("manager","org-a")).thenReturn(new AccessProfile("MANAGER","dept-a",Set.of("PEOPLE_VIEW")));
        var second=refresh(first.get("refreshToken").asText());
        assertThat(decoder.decode(second.get("accessToken").asText()).getClaimAsStringList("permissions")).containsExactly("PEOPLE_VIEW");
        assertThat(second.get("refreshToken").asText()).isNotEqualTo(first.get("refreshToken").asText());
        mvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of("refreshToken",first.get("refreshToken").asText()))))
            .andExpect(status().isUnauthorized());
    }
    @Test void removalChangesRoleToStaffWithoutDepartmentOnRefresh() throws Exception {
        var first=login("manager");
        when(people.resolve("manager","org-a")).thenReturn(new AccessProfile("STAFF",null,Set.of()));
        var token=decoder.decode(refresh(first.get("refreshToken").asText()).get("accessToken").asText());
        assertThat(token.getClaimAsString("role")).isEqualTo("STAFF");
        assertThat(token.getClaimAsStringList("roles")).doesNotContain("MANAGER").contains("STAFF");
        assertThat(token.getClaimAsString("departmentId")).isNull();
        assertThat(token.getClaimAsStringList("permissions")).isEmpty();
    }
    @Test void peopleUnavailableRefusesNewToken() throws Exception {
        when(people.resolve(anyString(),anyString())).thenThrow(new com.mems.exception.ApiException(
            HttpStatus.SERVICE_UNAVAILABLE,"Department permissions unavailable"));
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of("username","manager","password",PASSWORD))))
            .andExpect(status().isServiceUnavailable());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM refresh_token",Integer.class)).isZero();
    }
    @Test void legacyOrgOwnerKeepsRolesAndReceivesOwnerAuthorityWithoutPeopleCall() throws Exception {
        createAccount("legacy-owner","ORG_OWNER",false);
        var token=decoder.decode(login("legacy-owner").get("accessToken").asText());
        assertThat(token.getClaimAsStringList("roles")).contains("ORG_OWNER","OWNER");
        assertThat(token.getClaimAsString("role")).isEqualTo("OWNER");
        assertThat(token.getClaimAsStringList("permissions")).contains("FACILITY_MANAGE","PEOPLE_EDIT","SCHEDULE_CREATE");
        verify(people,never()).resolve(eq("legacy-owner"),anyString());
    }
    @Test void legacySuperAdminStillLogsInWithoutOrganization() throws Exception {
        jdbc.update("INSERT INTO role(code,name,scope) VALUES ('SUPER_ADMIN','Platform administrator','platform') ON DUPLICATE KEY UPDATE name=VALUES(name)");
        jdbc.update("INSERT INTO account(id,username,password_hash,status) VALUES ('admin','admin',?,'active')",encoder.encode(PASSWORD));
        jdbc.update("INSERT INTO account_role SELECT 'admin',id FROM role WHERE code='SUPER_ADMIN'");
        var token=decoder.decode(login("admin").get("accessToken").asText());
        assertThat(token.getClaimAsStringList("roles")).containsExactly("SUPER_ADMIN");
        assertThat(token.getClaimAsString("orgId")).isNull();
    }
    @Test void temporaryPasswordRequiresChangeAndRevokesRefreshTokens() throws Exception {
        createAccount("temporary","STAFF",true);
        when(people.resolve("temporary","org-a")).thenReturn(new AccessProfile("STAFF","dept-a",Set.of("PEOPLE_VIEW")));
        var first=login("temporary");
        String access=first.get("accessToken").asText();
        assertThat(decoder.decode(access).getClaimAsBoolean("mustChangePassword")).isTrue();
        mvc.perform(get("/api/v1/modules").header("Authorization","Bearer "+access))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("PASSWORD_CHANGE_REQUIRED"));
        mvc.perform(post("/api/v1/auth/change-password").header("Authorization","Bearer "+access)
            .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                "currentPassword",PASSWORD,"newPassword","A-different-private-password-2026"))))
            .andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT must_change_password FROM account WHERE id='temporary'",Boolean.class)).isFalse();
        assertThat(encoder.matches("A-different-private-password-2026",
            jdbc.queryForObject("SELECT password_hash FROM account WHERE id='temporary'",String.class))).isTrue();
        mvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of("refreshToken",first.get("refreshToken").asText()))))
            .andExpect(status().isUnauthorized());
    }
    @Test void internalProvisioningStoresOnlyHashAndCanBeCompensated() throws Exception {
        String id=UUID.randomUUID().toString();
        mvc.perform(post("/internal/accounts").header("X-Internal-Api-Key",KEY).contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of("userId",id,"orgId","org-a","username","new-staff",
                "email","new@example.com","temporaryPassword",PASSWORD,"role","STAFF","appointedBy","owner"))))
            .andExpect(status().isCreated());
        String hash=jdbc.queryForObject("SELECT password_hash FROM account WHERE id=?",String.class,id);
        assertThat(hash).isNotEqualTo(PASSWORD);assertThat(encoder.matches(PASSWORD,hash)).isTrue();
        assertThat(jdbc.queryForObject("SELECT must_change_password FROM account WHERE id=?",Boolean.class,id)).isTrue();
        mvc.perform(delete("/internal/accounts/"+id+"?orgId=org-a").header("X-Internal-Api-Key",KEY))
            .andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM account WHERE id=?",Integer.class,id)).isZero();
    }
    @Test void internalProvisioningCannotBeCalledWithoutSecret() throws Exception {
        mvc.perform(get("/internal/permissions")).andExpect(status().isUnauthorized());
    }
    @Test void compensationCannotDeleteUnrelatedAccount() throws Exception {
        mvc.perform(delete("/internal/accounts/manager?orgId=org-a").header("X-Internal-Api-Key",KEY))
            .andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM account WHERE id='manager'",Integer.class)).isEqualTo(1);
    }
    @Test void bootstrapIsIdempotentAndNeverResetsPassword() throws Exception {
        var bootstrap=new MockEnvironment().withProperty("OWNER_BOOTSTRAP_ENABLED","true")
            .withProperty("OWNER_BOOTSTRAP_ORG_ID","org-a").withProperty("OWNER_BOOTSTRAP_EMAIL","bootstrap@example.com")
            .withProperty("OWNER_BOOTSTRAP_PASSWORD",PASSWORD);
        var initializer=new IdentityDataInitializer(jdbc,encoder,bootstrap);
        initializer.run(null);
        String first=jdbc.queryForObject("SELECT password_hash FROM account WHERE username='bootstrap@example.com'",String.class);
        initializer.run(null);
        assertThat(jdbc.queryForObject("SELECT password_hash FROM account WHERE username='bootstrap@example.com'",String.class)).isEqualTo(first);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM role WHERE code IN ('OWNER','MANAGER','STAFF')",Integer.class)).isEqualTo(3);
    }
    @Test void bootstrapCannotPromoteAnExistingStaffAccount() {
        var bootstrap=new MockEnvironment().withProperty("OWNER_BOOTSTRAP_ENABLED","true")
            .withProperty("OWNER_BOOTSTRAP_ORG_ID","org-a").withProperty("OWNER_BOOTSTRAP_EMAIL","manager@example.com")
            .withProperty("OWNER_BOOTSTRAP_USERNAME","manager").withProperty("OWNER_BOOTSTRAP_PASSWORD",PASSWORD);
        assertThatThrownBy(() -> new IdentityDataInitializer(jdbc,encoder,bootstrap).run(null))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("conflicts");
    }
    @Test void bootstrapRejectsInactiveOrganization() {
        jdbc.update("UPDATE organization SET status='pending' WHERE id='org-a'");
        var bootstrap=new MockEnvironment().withProperty("OWNER_BOOTSTRAP_ENABLED","true")
            .withProperty("OWNER_BOOTSTRAP_ORG_ID","org-a").withProperty("OWNER_BOOTSTRAP_EMAIL","bootstrap@example.com")
            .withProperty("OWNER_BOOTSTRAP_PASSWORD",PASSWORD);
        assertThatThrownBy(() -> new IdentityDataInitializer(jdbc,encoder,bootstrap).run(null))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("active organization");
    }
    @Test void openApiIsPublicAndContainsBearerScheme() throws Exception {
        var result=mvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
            .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.scheme").value("bearer")).andReturn();
        assertThat(result.getResponse().getContentAsString()).doesNotContain("/internal/");
    }
}
