package com.mems.controller;

import com.mems.dto.ScheduleDraftConfirmResponse;
import com.mems.dto.ScheduleDraftDetailResponse;
import com.mems.dto.ScheduleDraftPatchRequest;
import com.mems.dto.ScheduleDraftRequest;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import com.mems.service.ScheduleDraftService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ScheduleDraftControllerTest {
    private static final String ORG = "org-1";
    private static final String DEPT = "dept-1";
    private static final String DRAFT = "draft-1";
    private static final Set<String> VIEW = Set.of("schedule.view");
    private static final Set<String> WRITE = Set.of("schedule.create");

    private final ScheduleDraftService drafts = mock(ScheduleDraftService.class);
    private final Actor actor = mock(Actor.class);
    private final OrganizationModuleGuard modules = mock(OrganizationModuleGuard.class);
    private final ScheduleDraftController controller =
        new ScheduleDraftController(drafts, actor, modules);

    @BeforeEach
    void setUp() {
        when(actor.orgId()).thenReturn(ORG);
        when(actor.userId()).thenReturn("user-1");
    }

    @Test
    @DisplayName("Tạo nháp: kiểm module ghi + quyền create, trả 201")
    void createRequiresWriteGuardAndReturnsCreated() {
        ScheduleDraftRequest request =
            new ScheduleDraftRequest(List.of("class-1"), LocalDate.of(2026, 11, 30),
                LocalDate.of(2026, 12, 6), null);
        ScheduleDraftDetailResponse detail = detail("DRAFT");
        when(drafts.create(ORG, DEPT, "user-1", request)).thenReturn(detail);

        ResponseEntity<ScheduleDraftDetailResponse> response = controller.create(DEPT, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isSameAs(detail);
        verify(modules).requireModuleForWrite(ORG, "SCHEDULE_MANAGEMENT");
        verify(actor).requireAnyPermissionIn(WRITE, DEPT);
    }

    @Test
    @DisplayName("Đọc chi tiết: chỉ cần module đọc + quyền view")
    void detailRequiresReadGuard() {
        ScheduleDraftDetailResponse detail = detail("DRAFT");
        when(drafts.detail(ORG, DEPT, DRAFT, 2)).thenReturn(detail);

        assertThat(controller.detail(DEPT, DRAFT, 2)).isSameAs(detail);
        verify(modules).requireModuleReadable(ORG, "SCHEDULE_MANAGEMENT");
        verify(actor).requireAnyPermissionIn(VIEW, DEPT);
        verify(modules, never()).requireModuleForWrite(anyString(), anyString());
    }

    @Test
    @DisplayName("Sửa tay: kiểm quyền ghi trước khi gọi service")
    void patchRequiresWriteGuard() {
        ScheduleDraftPatchRequest request = new ScheduleDraftPatchRequest("room-2", null, null, null);
        doThrow(new AppException(ErrorCode.FORBIDDEN, "off"))
            .when(modules).requireModuleForWrite(ORG, "SCHEDULE_MANAGEMENT");

        assertThatThrownBy(() -> controller.patchItem(DEPT, DRAFT, "item-1", request))
            .isInstanceOf(AppException.class);
        verify(drafts, never()).patchItem(anyString(), anyString(), anyString(), anyString(), any());
    }

    @Test
    @DisplayName("Xác nhận: đủ buổi trả 200, có buổi lỗi trả 409 kèm chi tiết")
    void confirmMapsFailureToConflict() {
        when(drafts.confirm(ORG, DEPT, DRAFT))
            .thenReturn(new ScheduleDraftConfirmResponse(2, List.of()));
        assertThat(controller.confirm(DEPT, DRAFT).getStatusCode()).isEqualTo(HttpStatus.OK);

        ScheduleDraftConfirmResponse failed = new ScheduleDraftConfirmResponse(0, List.of(
            new ScheduleDraftConfirmResponse.FailedItem("item-1", "class-1", "Toán", "Trùng giờ")));
        when(drafts.confirm(ORG, DEPT, DRAFT)).thenReturn(failed);
        ResponseEntity<ScheduleDraftConfirmResponse> conflict = controller.confirm(DEPT, DRAFT);

        assertThat(conflict.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(conflict.getBody()).isSameAs(failed);
        verify(actor, times(2)).requireAnyPermissionIn(WRITE, DEPT);
    }

    @Test
    @DisplayName("Huỷ: kiểm quyền ghi và trả 204")
    void discardReturnsNoContent() {
        ResponseEntity<Void> response = controller.discard(DEPT, DRAFT);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(drafts).discard(ORG, DEPT, DRAFT);
        verify(actor).requireAnyPermissionIn(WRITE, DEPT);
    }

    private static ScheduleDraftDetailResponse detail(String status) {
        return new ScheduleDraftDetailResponse(DRAFT, status, DEPT, List.of("class-1"),
            LocalDate.of(2026, 11, 30), LocalDate.of(2026, 12, 6), 1, 1, List.of(), List.of(),
            0, 0, 0, true, 10L, 5L, Instant.parse("2026-11-27T00:00:00Z"), null);
    }
}
