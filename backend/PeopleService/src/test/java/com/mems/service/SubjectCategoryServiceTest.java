package com.mems.service;

import com.mems.dto.SubjectCategoryRequest;
import com.mems.dto.SubjectCategoryResponse;
import com.mems.dto.SubjectCategoryStatusRequest;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.SubjectCategoryRepository;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubjectCategoryServiceTest {

    @Mock
    private SubjectCategoryRepository repository;

    @Mock
    private Actor actor;

    @Mock
    private OrganizationModuleGuard moduleGuard;

    @Mock
    private PeopleAuditService audit;

    private SubjectCategoryService service;

    private final String orgId = "org-1";
    private final String userId = "user-1";

    @BeforeEach
    void setUp() {
        service = new SubjectCategoryService(repository, actor, moduleGuard, audit);
        lenient().when(actor.orgId()).thenReturn(orgId);
        lenient().when(actor.userId()).thenReturn(userId);
    }

    private SubjectCategoryResponse sample(String id, String name, boolean active, int count) {
        return new SubjectCategoryResponse(id, name, active, count, Instant.now(), null);
    }

    @Test
    @DisplayName("List ẩn category ngừng khi người dùng không phải owner và không có subject.manage")
    void listHidesInactiveForNonManager() {
        when(actor.owner()).thenReturn(false);
        when(actor.hasPermission("subject.manage")).thenReturn(false);
        when(repository.list(orgId, false)).thenReturn(List.of(sample("cat-1", "Lập trình", true, 2)));

        List<SubjectCategoryResponse> result = service.list(true);

        assertThat(result).hasSize(1);
        verify(moduleGuard).requireModuleReadable(orgId, "STUDENT_MANAGEMENT");
        verify(repository).list(orgId, false);
    }

    @Test
    @DisplayName("Owner xem được category đã ngừng")
    void listIncludesInactiveForOwner() {
        when(actor.owner()).thenReturn(true);
        when(repository.list(orgId, true)).thenReturn(List.of());

        service.list(true);

        verify(repository).list(orgId, true);
    }

    @Test
    @DisplayName("Tạo category ghi audit SUBJECT_CATEGORY_CREATED")
    void createRecordsAudit() {
        SubjectCategoryRequest req = new SubjectCategoryRequest("Lập trình");
        SubjectCategoryResponse created = sample("cat-1", "Lập trình", true, 0);
        when(repository.create(orgId, "Lập trình", userId)).thenReturn(created);

        SubjectCategoryResponse result = service.create(req);

        assertThat(result.id()).isEqualTo("cat-1");
        verify(moduleGuard).requireModule(orgId, "STUDENT_MANAGEMENT");
        verify(audit).record(eq(orgId), eq(userId), eq("SUBJECT_CATEGORY_CREATED"), eq("cat-1"), any());
    }

    @Test
    @DisplayName("Đổi tên category ghi audit kèm before/after")
    void updateRecordsAudit() {
        SubjectCategoryRequest req = new SubjectCategoryRequest("Tin học");
        SubjectCategoryResponse before = sample("cat-1", "Lập trình", true, 1);
        SubjectCategoryResponse after = sample("cat-1", "Tin học", true, 1);
        when(repository.require("cat-1", orgId)).thenReturn(before);
        when(repository.update("cat-1", orgId, "Tin học", userId)).thenReturn(after);

        SubjectCategoryResponse result = service.update("cat-1", req);

        assertThat(result.name()).isEqualTo("Tin học");
        verify(audit).record(eq(orgId), eq(userId), eq("SUBJECT_CATEGORY_UPDATED"), eq("cat-1"), any());
    }

    @Test
    @DisplayName("Ngừng category trả subjectCount và ghi audit")
    void updateStatusReturnsAffectedSubjects() {
        SubjectCategoryStatusRequest req = new SubjectCategoryStatusRequest(false);
        SubjectCategoryResponse after = sample("cat-1", "Lập trình", false, 3);
        when(repository.setActive("cat-1", orgId, false, userId)).thenReturn(after);

        SubjectCategoryResponse result = service.updateStatus("cat-1", req);

        assertThat(result.active()).isFalse();
        assertThat(result.subjectCount()).isEqualTo(3);
        verify(audit).record(eq(orgId), eq(userId), eq("SUBJECT_CATEGORY_STATUS_CHANGED"), eq("cat-1"), any());
    }

    @Test
    @DisplayName("Module STUDENT_MANAGEMENT bị tắt thì không tạo được category")
    void createWhenModuleDisabledThrows() {
        doThrow(new AppException(ErrorCode.MODULE_NOT_ENABLED))
            .when(moduleGuard).requireModule(orgId, "STUDENT_MANAGEMENT");

        assertThatThrownBy(() -> service.create(new SubjectCategoryRequest("Lập trình")))
            .isInstanceOf(AppException.class)
            .satisfies(e -> assertThat(((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.MODULE_NOT_ENABLED));
        verify(repository, never()).create(any(), any(), any());
    }
}
