package com.mems.people;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mems.client.IdentityClient;
import com.mems.dto.*;
import com.mems.repository.MemberRepository;
import com.mems.service.AccountCompensationService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class DepartmentAccessTests {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired AccountCompensationService compensation;
    @MockBean IdentityClient identity;
    @SpyBean MemberRepository members;

    @BeforeEach void fixtures() {
        for(String table:List.of("member_position","department_member","position_permission","position",
                "department","people_audit_log","account_compensation")) jdbc.update("DELETE FROM "+table);
        for(String id:List.of("dept-a","dept-b")) jdbc.update(
            "INSERT INTO department(id,org_id,name,created_at) VALUES (?,'org-a',?,CURRENT_TIMESTAMP)",id,id);
        jdbc.update("INSERT INTO department(id,org_id,name,created_at) VALUES ('dept-foreign','org-b','Foreign',CURRENT_TIMESTAMP)");
        for(String id:List.of("basic","facility")) jdbc.update(
            "INSERT INTO position(id,org_id,name,created_at) VALUES (?,'org-a',?,CURRENT_TIMESTAMP)",id,id);
        jdbc.update("INSERT INTO position_permission VALUES ('basic','PEOPLE_VIEW'),('basic','PEOPLE_EDIT'),('facility','FACILITY_MANAGE')");
        jdbc.update("INSERT INTO department_member VALUES ('manager','org-a','dept-a','MANAGER','owner',CURRENT_TIMESTAMP)");
        jdbc.update("INSERT INTO member_position VALUES ('manager','basic','org-a')");
        when(identity.permissions()).thenReturn(List.of(new PermissionResponse("PEOPLE_VIEW","View people"),
            new PermissionResponse("PEOPLE_EDIT","Edit people"),new PermissionResponse("FACILITY_MANAGE","Facilities")));
    }
    RequestPostProcessor actor(String id,String role,String dept,String... permissions) {
        var authorities=new ArrayList<org.springframework.security.core.GrantedAuthority>();
        authorities.add(new SimpleGrantedAuthority("ROLE_"+role));
        Arrays.stream(permissions).forEach(p -> authorities.add(new SimpleGrantedAuthority(p)));
        return jwt().jwt(j -> j.subject(id).claim("orgId","org-a").claim("role",role)
            .claim("roles",List.of(role)).claim("departmentId",dept)).authorities(authorities);
    }
    RequestPostProcessor owner() { return actor("owner","OWNER","dept-a"); }
    RequestPostProcessor manager() { return actor("manager","MANAGER","dept-a","PEOPLE_VIEW","PEOPLE_EDIT"); }
    String request(String role,String position) throws Exception {
        return json.writeValueAsString(Map.of("username","new-user","email","user@example.com","role",role,
            "positionIds",Set.of(position)));
    }
    int count(String table) { return jdbc.queryForObject("SELECT COUNT(*) FROM "+table,Integer.class); }

    String signedToken(String issuer,String role,Set<String> permissions) {
        byte[] key=Base64.getDecoder().decode("MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=");
        var encoder=new org.springframework.security.oauth2.jwt.NimbusJwtEncoder(
            new com.nimbusds.jose.jwk.source.ImmutableSecret<>(new javax.crypto.spec.SecretKeySpec(key,"HmacSHA256")));
        var claims=org.springframework.security.oauth2.jwt.JwtClaimsSet.builder().issuer(issuer).subject("manager")
            .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(300)).claim("orgId","org-a")
            .claim("departmentId","dept-a").claim("roles",List.of(role)).claim("permissions",permissions).build();
        return encoder.encode(org.springframework.security.oauth2.jwt.JwtEncoderParameters.from(
            org.springframework.security.oauth2.jwt.JwsHeader.with(org.springframework.security.oauth2.jose.jws.MacAlgorithm.HS256).build(),claims))
            .getTokenValue();
    }

    @Test void actualBearerMapsPermissionClaims() throws Exception {
        mvc.perform(get("/departments/dept-a/members").header("Authorization","Bearer "+
            signedToken("mems-identity","MANAGER",Set.of("PEOPLE_VIEW"))))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].userId").value("manager"));
    }
    @Test void actualLegacyOwnerBearerCanCreateDepartment() throws Exception {
        mvc.perform(post("/departments").header("Authorization","Bearer "+signedToken("mems-identity","ORG_OWNER",Set.of()))
            .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Legacy owner department\"}"))
            .andExpect(status().isCreated());
    }
    @Test void bearerWithWrongIssuerIsRejectedEvenWhenSignatureIsValid() throws Exception {
        mvc.perform(get("/departments").header("Authorization","Bearer "+signedToken("wrong-issuer","OWNER",Set.of())))
            .andExpect(status().isUnauthorized());
    }

    @Test void noTokenReturns401() throws Exception {
        mvc.perform(get("/departments")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }
    @Test void invalidBearerSignatureReturns401() throws Exception {
        mvc.perform(get("/departments").header("Authorization","Bearer invalid.token.signature")).andExpect(status().isUnauthorized());
    }
    @Test void staffCannotCreateDepartment() throws Exception {
        mvc.perform(post("/departments").with(actor("staff","STAFF","dept-a")).contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"New\"}")).andExpect(status().isForbidden());
    }
    @Test void ownerCreatesDepartmentInOwnOrganization() throws Exception {
        mvc.perform(post("/departments").with(owner()).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\" New department \"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.name").value("New department"));
        assertThat(jdbc.queryForObject("SELECT org_id FROM department WHERE name='New department'",String.class)).isEqualTo("org-a");
    }
    @Test void invalidDepartmentReturnsConsistentError() throws Exception {
        mvc.perform(post("/departments").with(owner()).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\" \"}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
    @Test void ownerCannotChangeAnotherOrganizationDepartment() throws Exception {
        mvc.perform(put("/departments/dept-foreign").with(owner()).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Changed\"}"))
            .andExpect(status().isNotFound());
        assertThat(jdbc.queryForObject("SELECT name FROM department WHERE id='dept-foreign'",String.class)).isEqualTo("Foreign");
    }
    @Test void duplicateDepartmentNameReturns409() throws Exception {
        mvc.perform(post("/departments").with(owner()).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"dept-a\"}"))
            .andExpect(status().isConflict());
    }
    @Test void populatedDepartmentCannotBeDeleted() throws Exception {
        mvc.perform(delete("/departments/dept-a").with(owner())).andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("DEPARTMENT_NOT_EMPTY"));
    }
    @Test void emptyDepartmentCanBeDeleted() throws Exception {
        mvc.perform(delete("/departments/dept-b").with(owner())).andExpect(status().isNoContent());
    }
    @Test void managerCannotReadAnotherDepartment() throws Exception {
        mvc.perform(get("/departments/dept-b/members").with(manager())).andExpect(status().isForbidden());
    }
    @Test void managerSeesOnlyOwnDepartmentInList() throws Exception {
        mvc.perform(get("/departments").with(manager())).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].id").value("dept-a"));
    }
    @Test void managerCannotAppointManager() throws Exception {
        mvc.perform(post("/departments/dept-a/members").with(manager()).contentType(MediaType.APPLICATION_JSON)
            .content(request("MANAGER","basic"))).andExpect(status().isForbidden());
        verify(identity,never()).createAccount(anyString(),anyString(),any(),anyString(),anyString());
    }
    @Test void managerCannotGrantPermissionsTheyDoNotHave() throws Exception {
        mvc.perform(post("/departments/dept-a/members").with(manager()).contentType(MediaType.APPLICATION_JSON)
            .content(request("STAFF","facility"))).andExpect(status().isForbidden());
        verify(identity,never()).createAccount(anyString(),anyString(),any(),anyString(),anyString());
    }
    @Test void managerCannotCreateStaffInAnotherDepartment() throws Exception {
        mvc.perform(post("/departments/dept-b/members").with(manager()).contentType(MediaType.APPLICATION_JSON)
            .content(request("STAFF","basic"))).andExpect(status().isForbidden());
        verify(identity,never()).createAccount(anyString(),anyString(),any(),anyString(),anyString());
    }
    @Test void managerCannotBroadenExistingStaffPositions() throws Exception {
        members.create("staff","org-a","dept-a","STAFF","owner");
        members.assign("staff","org-a",Set.of("basic"));
        mvc.perform(put("/departments/dept-a/members/staff/positions").with(manager()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"positionIds\":[\"facility\"]}")).andExpect(status().isForbidden());
        assertThat(members.positionIds("staff",false)).containsExactly("basic");
        assertThat(count("people_audit_log")).isZero();
    }
    @Test void managerCannotRemoveManagerAppointment() throws Exception {
        mvc.perform(delete("/departments/dept-a/members/manager").with(manager())).andExpect(status().isForbidden());
        assertThat(count("department_member")).isEqualTo(1);
    }
    @Test void ownerCannotAssignPositionFromAnotherOrganization() throws Exception {
        jdbc.update("INSERT INTO position(id,org_id,name,created_at) VALUES ('foreign-position','org-b','Foreign',CURRENT_TIMESTAMP)");
        mvc.perform(post("/departments/dept-a/members").with(owner()).contentType(MediaType.APPLICATION_JSON)
            .content(request("STAFF","foreign-position"))).andExpect(status().isNotFound());
        verify(identity,never()).createAccount(anyString(),anyString(),any(),anyString(),anyString());
    }
    @Test void staleTokenCannotGrantRemovedManagerPermission() throws Exception {
        jdbc.update("DELETE FROM position_permission WHERE permission_code='PEOPLE_EDIT'");
        mvc.perform(post("/departments/dept-a/members").with(manager()).contentType(MediaType.APPLICATION_JSON)
            .content(request("STAFF","basic"))).andExpect(status().isForbidden());
    }
    @Test void ownerSuccessfullyCreatesManagerAndAuditWithoutPassword() throws Exception {
        var response=mvc.perform(post("/departments/dept-a/members").with(owner()).contentType(MediaType.APPLICATION_JSON)
            .content(request("MANAGER","basic"))).andExpect(status().isCreated())
            .andExpect(jsonPath("$.member.role").value("MANAGER")).andExpect(jsonPath("$.mustChangePassword").value(true)).andReturn();
        var body=json.readTree(response.getResponse().getContentAsString());
        String id=body.at("/member/userId").asText(),password=body.get("temporaryPassword").asText();
        assertThat(password.length()).isGreaterThanOrEqualTo(24);
        assertThat(count("account_compensation")).isZero();
        assertThat(jdbc.queryForObject("SELECT details FROM people_audit_log WHERE target_id=?",String.class,id)).doesNotContain(password);
        verify(identity).createAccount(eq(id),eq("org-a"),any(MemberRequest.class),eq(password),eq("owner"));
    }
    @Test void managerCanCreateStaffWithSubsetPermissions() throws Exception {
        mvc.perform(post("/departments/dept-a/members").with(manager()).contentType(MediaType.APPLICATION_JSON)
            .content(request("STAFF","basic"))).andExpect(status().isCreated()).andExpect(jsonPath("$.member.role").value("STAFF"));
    }
    @Test void localSaveFailureRollsBackAppointmentAndDeletesAccount() throws Exception {
        doThrow(new DataIntegrityViolationException("simulated DB failure")).when(members)
            .create(anyString(),anyString(),anyString(),anyString(),anyString());
        mvc.perform(post("/departments/dept-a/members").with(owner()).contentType(MediaType.APPLICATION_JSON)
            .content(request("MANAGER","basic"))).andExpect(status().isConflict());
        verify(identity).deleteAccount(anyString(),eq("org-a"));
        assertThat(count("department_member")).isEqualTo(1);
        assertThat(count("account_compensation")).isZero();
        assertThat(count("people_audit_log")).isZero();
    }
    @Test void failedCompensationStaysDurableAndCanBeRetried() throws Exception {
        doThrow(new DataIntegrityViolationException("save failed")).when(members)
            .create(anyString(),anyString(),anyString(),anyString(),anyString());
        doThrow(new IllegalStateException("Identity down")).when(identity).deleteAccount(anyString(),anyString());
        mvc.perform(post("/departments/dept-a/members").with(owner()).contentType(MediaType.APPLICATION_JSON)
            .content(request("MANAGER","basic"))).andExpect(status().isConflict());
        assertThat(count("account_compensation")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT attempts FROM account_compensation",Integer.class)).isEqualTo(1);
        doNothing().when(identity).deleteAccount(anyString(),anyString());
        jdbc.update("UPDATE account_compensation SET created_at=?",Timestamp.from(Instant.now().minusSeconds(180)));
        compensation.retry();
        assertThat(count("account_compensation")).isZero();
    }
    @Test void identityTimeoutKeepsPendingCompensationForGracePeriod() throws Exception {
        doThrow(new com.mems.exception.ApiException(HttpStatus.SERVICE_UNAVAILABLE,"IDENTITY_UNAVAILABLE","Unavailable"))
            .when(identity).createAccount(anyString(),anyString(),any(),anyString(),anyString());
        mvc.perform(post("/departments/dept-a/members").with(owner()).contentType(MediaType.APPLICATION_JSON)
            .content(request("MANAGER","basic"))).andExpect(status().isServiceUnavailable());
        assertThat(count("account_compensation")).isEqualTo(1);
        verify(identity,never()).deleteAccount(anyString(),anyString());
    }
    @Test void ownerCannotRemoveOwnAccess() throws Exception {
        mvc.perform(put("/departments/dept-a/members/owner/positions").with(owner()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"positionIds\":[]}")).andExpect(status().isForbidden());
    }
    @Test void assignedPositionCannotBeDeleted() throws Exception {
        mvc.perform(delete("/positions/basic").with(owner())).andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("POSITION_IN_USE"));
    }
    @Test void unknownPermissionCannotBeUsedInPosition() throws Exception {
        mvc.perform(post("/positions").with(owner()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Bad\",\"permissions\":[\"NOT_A_PERMISSION\"]}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("UNKNOWN_PERMISSION"));
    }
    @Test void ownerCanChangePositionAndAuditEffectivePermissions() throws Exception {
        mvc.perform(put("/positions/basic").with(owner()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Basic changed\",\"permissions\":[\"PEOPLE_VIEW\"]}"))
            .andExpect(status().isOk());
        assertThat(members.authorization("manager","org-a").permissions()).containsExactly("PEOPLE_VIEW");
        assertThat(jdbc.queryForObject("SELECT action FROM people_audit_log",String.class)).isEqualTo("POSITION_UPDATED");
    }
    @Test void removalClearsCurrentDepartmentAndPermissions() throws Exception {
        mvc.perform(delete("/departments/dept-a/members/manager").with(owner())).andExpect(status().isNoContent());
        assertThat(members.authorization("manager","org-a")).isEqualTo(new AuthorizationResponse("STAFF",null,Set.of()));
    }
    @Test void internalApiRequiresServiceSecret() throws Exception {
        mvc.perform(get("/internal/users/manager/authorization?orgId=org-a")).andExpect(status().isUnauthorized());
        mvc.perform(get("/internal/users/manager/authorization?orgId=org-a")
            .header("X-Internal-Api-Key","test-internal-key-at-least-thirty-two-characters"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.departmentId").value("dept-a"));
    }
    @Test void temporaryPasswordTokenCannotUseBusinessApi() throws Exception {
        mvc.perform(get("/departments").with(jwt().jwt(j -> j.subject("owner").claim("orgId","org-a")
            .claim("mustChangePassword",true)).authorities(new SimpleGrantedAuthority("ROLE_OWNER"))))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("PASSWORD_CHANGE_REQUIRED"));
    }
    @Test void corsPreflightAllowsConfiguredOrigin() throws Exception {
        mvc.perform(options("/departments").header("Origin","http://localhost:5173")
            .header("Access-Control-Request-Method","POST").header("Access-Control-Request-Headers","authorization,content-type"))
            .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin","http://localhost:5173"));
    }
    @Test void openApiDeclaresBearerAndHidesInternalEndpoints() throws Exception {
        var result=mvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
            .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.scheme").value("bearer")).andReturn();
        assertThat(result.getResponse().getContentAsString()).doesNotContain("/internal/");
    }
}
