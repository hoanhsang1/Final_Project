package com.mems.service;

import com.mems.dto.ClassCloseRejectRequest;
import com.mems.dto.ClassCloseRequest;
import com.mems.outbox.OutboxEventRepository;
import com.mems.repository.ClassStatusRepository;
import com.mems.repository.SchoolClassRepository;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Set;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Quy tắc 14: yêu cầu đóng lớp phải báo cho trưởng phòng và người yêu cầu. */
@JdbcTest
class ClassStatusNotificationTest {
    private static final String ORG = "org-1";
    private static final Instant NOW = Instant.parse("2026-11-06T00:00:00Z");

    @Autowired
    private JdbcTemplate jdbc;

    private NotificationService notifications;
    private ClassStatusService service;

    @BeforeEach
    void setUp() {
        Actor actor = mock(Actor.class);
        when(actor.orgId()).thenReturn(ORG);
        when(actor.userId()).thenReturn("approver-1");
        when(actor.hasOrganizationScope(anyString())).thenReturn(true);

        ClassApprovalPolicy approvalPolicy = mock(ClassApprovalPolicy.class);
        when(approvalPolicy.classManagers(eq(ORG), anyString()))
            .thenReturn(java.util.Set.of("mgr-1"));

        notifications = mock(NotificationService.class);
        service = new ClassStatusService(new ClassStatusRepository(jdbc),
            new SchoolClassRepository(jdbc), actor, mock(OrganizationModuleGuard.class),
            approvalPolicy, notifications, mock(OutboxEventRepository.class));

        jdbc.update("""
            INSERT INTO school_class(id,org_id,class_code,name,status,close_state,version,created_by,created_at)
            VALUES ('class-1',?,'C1','Lớp 1','DANG_DIEN_RA','NONE',0,'owner',?)
            """, ORG, Timestamp.from(NOW));
    }

    private void markPending(String requester) {
        jdbc.update("""
            UPDATE school_class SET close_state='PENDING', close_requested_by=?
            WHERE id='class-1'
            """, requester);
    }

    @Test
    @DisplayName("Yêu cầu đóng lớp báo cho trưởng phòng phụ trách")
    void requestCloseNotifiesManagers() {
        service.requestClose("class-1", new ClassCloseRequest("Hết khoá"));

        verify(notifications).notifyAll(eq(ORG), eq(Set.of("mgr-1")), eq("CLASS_CLOSE_APPROVAL"),
            eq("Yêu cầu đóng lớp cần duyệt"), startsWith("Lớp C1 yêu cầu đóng."),
            eq("SCHOOL_CLASS"), eq("class-1"));
    }

    @Test
    @DisplayName("Duyệt đóng lớp báo cho người yêu cầu")
    void approveCloseNotifiesRequester() {
        markPending("requester-1");

        service.approveClose("class-1");

        verify(notifications).notify(ORG, "requester-1", "CLASS_CLOSE_APPROVAL",
            "Yêu cầu đóng lớp đã được duyệt", "Lớp C1 đã đóng.",
            "SCHOOL_CLASS", "class-1");
    }

    @Test
    @DisplayName("Từ chối đóng lớp báo người yêu cầu kèm lý do")
    void rejectCloseNotifiesRequesterWithReason() {
        markPending("requester-1");

        service.rejectClose("class-1", new ClassCloseRejectRequest("Chưa đủ điều kiện"));

        verify(notifications).notify(ORG, "requester-1", "CLASS_CLOSE_APPROVAL",
            "Yêu cầu đóng lớp bị từ chối",
            "Lớp C1 tiếp tục hoạt động. Lý do: Chưa đủ điều kiện",
            "SCHOOL_CLASS", "class-1");
    }
}
