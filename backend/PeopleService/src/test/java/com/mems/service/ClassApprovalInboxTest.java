package com.mems.service;

import com.mems.dto.ClassLifecycleInboxItem;
import com.mems.repository.ClassStatusRepository;
import com.mems.repository.SchoolClassRepository;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ClassApprovalInboxTest {

    private static final String ORG = "org-1";

    private SchoolClassRepository classes;
    private OrganizationModuleGuard guard;
    private ClassApprovalPolicy policy;
    private Actor actor;
    private ClassStatusService service;

    @BeforeEach
    void setUp() {
        classes = mock(SchoolClassRepository.class);
        guard = mock(OrganizationModuleGuard.class);
        policy = mock(ClassApprovalPolicy.class);
        actor = mock(Actor.class);

        service = new ClassStatusService(mock(ClassStatusRepository.class), classes, actor, guard,
            policy, mock(NotificationService.class));

        when(actor.orgId()).thenReturn(ORG);
        when(guard.isReadable(ORG, "STUDENT_MANAGEMENT")).thenReturn(true);
    }

    @Test
    @DisplayName("Hộp duyệt lớp chỉ giữ mục mà policy cho phép người gọi quyết định")
    void inboxFiltersByApprovalPolicy() {
        ClassLifecycleInboxItem close = item("class-1", "CLOSE", "creator-1");
        ClassLifecycleInboxItem cancel = item("class-2", "CANCEL", "creator-2");
        when(classes.pendingLifecycle(ORG)).thenReturn(List.of(close, cancel));
        when(policy.canApprove(ORG, "creator-1")).thenReturn(true);
        when(policy.canApprove(ORG, "creator-2")).thenReturn(false);

        assertThat(service.approvalInbox()).containsExactly(close);
    }

    @Test
    @DisplayName("Người tạo yêu cầu không tự duyệt: policy trả false thì mục bị ẩn")
    void requesterSeesNoSelfApprovalItem() {
        ClassLifecycleInboxItem own = item("class-1", "CLOSE", "actor-1");
        when(classes.pendingLifecycle(ORG)).thenReturn(List.of(own));
        when(policy.canApprove(ORG, "actor-1")).thenReturn(false);

        assertThat(service.approvalInbox()).isEmpty();
    }

    @Test
    @DisplayName("Module chưa đăng ký: hộp duyệt lớp rỗng, không truy vấn dữ liệu")
    void unregisteredModuleReturnsEmpty() {
        when(guard.isReadable(ORG, "STUDENT_MANAGEMENT")).thenReturn(false);

        assertThat(service.approvalInbox()).isEmpty();
        verify(classes, never()).pendingLifecycle(ORG);
    }

    private ClassLifecycleInboxItem item(String classId, String kind, String requesterId) {
        return new ClassLifecycleInboxItem(classId, "C-" + classId, "Lớp " + classId, "DANG_DIEN_RA",
            kind, requesterId, "Người tạo", "Lý do", Instant.parse("2026-11-10T00:00:00Z"), 12);
    }
}
