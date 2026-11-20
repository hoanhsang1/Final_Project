package com.mems.controller;

import com.mems.dto.ResetPasswordResponse;
import com.mems.dto.StudentAccountResponse;
import com.mems.service.MemberService;
import com.mems.service.StudentService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** HR-02: mọi response chứa mật khẩu tạm phải cấm cache ở trình duyệt/proxy. */
class CredentialCacheHeadersTest {

    @Test
    @DisplayName("Đặt lại mật khẩu nhân viên trả Cache-Control: no-store")
    void memberResetPasswordIsNotCacheable() throws Exception {
        var service = mock(MemberService.class);
        when(service.resetPassword("dept-1", "user-1"))
            .thenReturn(new ResetPasswordResponse("Temp@12345"));
        MockMvc mvc = MockMvcBuilders
            .standaloneSetup(new DepartmentMemberController(service)).build();

        mvc.perform(post("/departments/dept-1/members/user-1/reset-password"))
            .andExpect(status().isOk())
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.temporaryPassword").value("Temp@12345"));
    }

    @Test
    @DisplayName("Tạo tài khoản sinh viên trả Cache-Control: no-store")
    void studentAccountPasswordIsNotCacheable() throws Exception {
        var service = mock(StudentService.class);
        when(service.createAccount("stu-1"))
            .thenReturn(new StudentAccountResponse("stu-1", "sv@example.com", "Temp@12345"));
        MockMvc mvc = MockMvcBuilders
            .standaloneSetup(new StudentController(service)).build();

        mvc.perform(post("/students/stu-1/account"))
            .andExpect(status().isCreated())
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.temporaryPassword").value("Temp@12345"));
    }
}
