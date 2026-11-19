package com.mems.controller;

import com.mems.service.AccountService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * HTTP contract for the temporary-password flow. The service is mocked, so this
 * only proves the controller serialises the password the FE reads — the
 * generation and {@code must_change_password} logic is covered by
 * {@link com.mems.service.AccountServiceTest}.
 */
class AccountControllerTest {

    private AccountService accountService;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        accountService = mock(AccountService.class);
        mvc = MockMvcBuilders.standaloneSetup(new AccountController(accountService)).build();
    }

    @Test
    @DisplayName("POST /api/v1/accounts returns 201 with temporaryPassword")
    void createReturnsTemporaryPasswordInBody() throws Exception {
        when(accountService.createAccount(any())).thenReturn(Map.of(
                "id", "acct-1",
                "username", "new.person",
                "email", "new.person@example.com",
                "role", "STAFF",
                "temporaryPassword", "Temp@12345"));

        mvc.perform(post("/api/v1/accounts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"new.person@example.com","role":"STAFF"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.temporaryPassword").value("Temp@12345"))
                .andExpect(jsonPath("$.username").value("new.person"));
    }

    @Test
    @DisplayName("POST /api/v1/accounts/{id}/reset-password returns 200 with temporaryPassword")
    void resetReturnsTemporaryPasswordInBody() throws Exception {
        when(accountService.resetPassword(eq("acct-1"), isNull()))
                .thenReturn(Map.of("temporaryPassword", "Reset@98765"));

        mvc.perform(post("/api/v1/accounts/acct-1/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.temporaryPassword").value("Reset@98765"));
    }
}
