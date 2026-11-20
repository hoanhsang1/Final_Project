package com.mems.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrganizationApprovalServiceTest {

    @Mock
    private JdbcTemplate jdbc;

    private OrganizationApprovalService service;

    @BeforeEach
    void setUp() {
        service = new OrganizationApprovalService(jdbc);
    }

    @Test
    @DisplayName("Duyệt tổ chức ghi audit kèm actor từ JWT")
    void approveRecordsActor() {
        when(jdbc.queryForList(contains("SELECT status"), eq(String.class), eq("org-1")))
            .thenReturn(List.of("pending"));

        service.approve("org-1", "admin-1");

        Object[] audit = captureAudit();
        assertThat(audit[2]).isEqualTo("admin-1");
        assertThat(audit[3]).isEqualTo("ORG_APPROVED");
        assertThat(audit[6]).isNull();
    }

    @Test
    @DisplayName("Từ chối tổ chức ghi audit kèm actor và lý do")
    void rejectRecordsActorAndReason() {
        when(jdbc.queryForList(contains("SELECT status"), eq(String.class), eq("org-1")))
            .thenReturn(List.of("pending"));

        service.reject("org-1", "admin-1", "Thiếu hồ sơ pháp lý");

        Object[] audit = captureAudit();
        assertThat(audit[2]).isEqualTo("admin-1");
        assertThat(audit[3]).isEqualTo("ORG_REJECTED");
        assertThat(audit[6].toString()).contains("Thiếu hồ sơ pháp lý");
    }

    private Object[] captureAudit() {
        ArgumentCaptor<Object[]> args = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc).update(startsWith("INSERT INTO audit_log"), args.capture());
        return args.getValue();
    }
}
