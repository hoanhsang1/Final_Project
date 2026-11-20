package com.mems.service;

import com.mems.dto.*;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.SubjectRepository;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubjectServiceTest {

    @Mock
    private SubjectRepository repository;

    @Mock
    private Actor actor;

    @Mock
    private OrganizationModuleGuard moduleGuard;

    @Mock
    private PeopleAuditService audit;

    private SubjectService service;

    private final String orgId = "org-1";
    private final String userId = "user-1";

    @BeforeEach
    void setUp() {
        service = new SubjectService(repository, actor, moduleGuard, audit);
        lenient().when(actor.orgId()).thenReturn(orgId);
        lenient().when(actor.userId()).thenReturn(userId);
    }

    private SubjectResponse sampleSubject(String id, String code, String name, boolean active) {
        return new SubjectResponse(id, code, name, "Mô tả", active, Instant.now(), null);
    }

    @Test
    @DisplayName("TC-SUB-001: Tạo môn học thành công với code hợp lệ")
    void createSuccessWithCode() {
        SubjectRequest req = new SubjectRequest("TOAN10", "Toán 10", "Đại số");
        SubjectResponse resp = sampleSubject("sub-1", "TOAN10", "Toán 10", true);

        when(repository.findByCode(orgId, "TOAN10")).thenReturn(Optional.empty());
        when(repository.create(orgId, "TOAN10", "Toán 10", "Đại số", userId)).thenReturn(resp);

        SubjectResponse result = service.create(req);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo("sub-1");
        assertThat(result.code()).isEqualTo("TOAN10");
        verify(moduleGuard).requireModule(orgId, "STUDENT_MANAGEMENT");
        verify(audit).record(eq(orgId), eq(userId), eq("SUBJECT_CREATED"), eq("sub-1"), any());
    }

    @Test
    @DisplayName("TC-SUB-020: Tạo môn học với code là NULL (D-04 cho phép)")
    void createSuccessWithNullCode() {
        SubjectRequest req = new SubjectRequest(null, "Ngữ văn 10", null);
        SubjectResponse resp = sampleSubject("sub-2", null, "Ngữ văn 10", true);

        when(repository.create(orgId, null, "Ngữ văn 10", null, userId)).thenReturn(resp);

        SubjectResponse result = service.create(req);

        assertThat(result.code()).isNull();
        verify(repository, never()).findByCode(any(), any());
        verify(moduleGuard).requireModule(orgId, "STUDENT_MANAGEMENT");
    }

    @Test
    @DisplayName("TC-SUB-005: Tạo môn trùng mã trong cùng tổ chức ném SUBJECT_CODE_EXISTS")
    void createDuplicateCodeThrowsException() {
        SubjectRequest req = new SubjectRequest("TOAN10", "Toán 10 Nâng cao", null);
        SubjectResponse existing = sampleSubject("sub-1", "TOAN10", "Toán 10", true);

        when(repository.findByCode(orgId, "TOAN10")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.create(req))
            .isInstanceOf(AppException.class)
            .satisfies(e -> {
                AppException ae = (AppException) e;
                assertThat(ae.getErrorCode()).isEqualTo(ErrorCode.SUBJECT_CODE_EXISTS);
            });
    }

    @Test
    @DisplayName("TC-SUB-017: Tạo môn khi module STUDENT_MANAGEMENT bị tắt ném MODULE_NOT_ENABLED")
    void createWhenModuleDisabledThrowsException() {
        SubjectRequest req = new SubjectRequest("TOAN10", "Toán 10", null);
        doThrow(new AppException(ErrorCode.MODULE_NOT_ENABLED))
            .when(moduleGuard).requireModule(orgId, "STUDENT_MANAGEMENT");

        assertThatThrownBy(() -> service.create(req))
            .isInstanceOf(AppException.class)
            .satisfies(e -> assertThat(((AppException) e).getErrorCode()).isEqualTo(ErrorCode.MODULE_NOT_ENABLED));
    }

    @Test
    @DisplayName("TC-SUB-008: Lấy chi tiết môn học thành công")
    void getSuccess() {
        SubjectResponse resp = sampleSubject("sub-1", "TOAN10", "Toán 10", true);
        when(repository.require("sub-1", orgId)).thenReturn(resp);

        SubjectResponse result = service.get("sub-1");

        assertThat(result.id()).isEqualTo("sub-1");
        verify(moduleGuard).requireModuleReadable(orgId, "STUDENT_MANAGEMENT");
    }

    @Test
    @DisplayName("TC-SUB-013: Lấy chi tiết môn học không thuộc org ném SUBJECT_NOT_FOUND")
    void getOtherOrgSubjectThrowsNotFound() {
        when(repository.require("sub-other", orgId))
            .thenThrow(new AppException(ErrorCode.SUBJECT_NOT_FOUND));

        assertThatThrownBy(() -> service.get("sub-other"))
            .isInstanceOf(AppException.class)
            .satisfies(e -> assertThat(((AppException) e).getErrorCode()).isEqualTo(ErrorCode.SUBJECT_NOT_FOUND));
    }

    @Test
    @DisplayName("TC-SUB-006: Cập nhật môn học thành công với code không đổi")
    void updateSuccessSameCode() {
        SubjectRequest req = new SubjectRequest("TOAN10", "Toán 10 Chuyên", "Mô tả mới");
        SubjectResponse before = sampleSubject("sub-1", "TOAN10", "Toán 10", true);
        SubjectResponse after = sampleSubject("sub-1", "TOAN10", "Toán 10 Chuyên", true);

        when(repository.require("sub-1", orgId)).thenReturn(before);
        when(repository.findByCode(orgId, "TOAN10")).thenReturn(Optional.of(before)); // same id -> ok
        when(repository.update(eq("sub-1"), eq(orgId), eq("TOAN10"), eq("Toán 10 Chuyên"), eq("Mô tả mới"), eq(userId)))
            .thenReturn(after);

        SubjectResponse result = service.update("sub-1", req);

        assertThat(result.name()).isEqualTo("Toán 10 Chuyên");
        verify(audit).record(eq(orgId), eq(userId), eq("SUBJECT_UPDATED"), eq("sub-1"), any());
    }

    @Test
    @DisplayName("TC-SUB-007: Cập nhật sang mã của môn khác trong org ném SUBJECT_CODE_EXISTS")
    void updateDuplicateCodeThrowsException() {
        SubjectRequest req = new SubjectRequest("LY10", "Toán 10", null);
        SubjectResponse current = sampleSubject("sub-1", "TOAN10", "Toán 10", true);
        SubjectResponse other = sampleSubject("sub-2", "LY10", "Vật lý 10", true);

        when(repository.require("sub-1", orgId)).thenReturn(current);
        when(repository.findByCode(orgId, "LY10")).thenReturn(Optional.of(other));

        assertThatThrownBy(() -> service.update("sub-1", req))
            .isInstanceOf(AppException.class)
            .satisfies(e -> assertThat(((AppException) e).getErrorCode()).isEqualTo(ErrorCode.SUBJECT_CODE_EXISTS));
    }

    @Test
    @DisplayName("TC-SUB-011: Cập nhật trạng thái môn học (kích hoạt/ngừng)")
    void updateStatusSuccess() {
        SubjectStatusRequest req = new SubjectStatusRequest(false);
        SubjectResponse after = sampleSubject("sub-1", "TOAN10", "Toán 10", false);

        when(repository.setActive("sub-1", orgId, false, userId)).thenReturn(after);
        when(repository.classUsage("sub-1", orgId)).thenReturn(2);

        SubjectResponse result = service.updateStatus("sub-1", req);

        assertThat(result.active()).isFalse();
        verify(audit).record(eq(orgId), eq(userId), eq("SUBJECT_STATUS_CHANGED"), eq("sub-1"), any());
    }

    @Test
    @DisplayName("TC-SUB-015: check-code trả available=true khi mã chưa có trong org")
    void checkCodeAvailable() {
        when(repository.findByCode(orgId, "HOA10")).thenReturn(Optional.empty());

        SubjectCodeCheckResponse resp = service.checkCode("HOA10", null);

        assertThat(resp.available()).isTrue();
        assertThat(resp.code()).isEqualTo("HOA10");
        assertThat(resp.existingId()).isNull();
    }

    @Test
    @DisplayName("TC-SUB-015: check-code trả available=false khi mã đã có trong org")
    void checkCodeNotAvailable() {
        SubjectResponse existing = sampleSubject("sub-hoa", "HOA10", "Hóa học 10", true);
        when(repository.findByCode(orgId, "HOA10")).thenReturn(Optional.of(existing));

        SubjectCodeCheckResponse resp = service.checkCode("HOA10", null);

        assertThat(resp.available()).isFalse();
        assertThat(resp.existingId()).isEqualTo("sub-hoa");
    }

    @Test
    @DisplayName("TC-SUB-015: check-code trả available=true khi trùng chính môn đang sửa (excludeId)")
    void checkCodeAvailableWithExcludeId() {
        SubjectResponse existing = sampleSubject("sub-hoa", "HOA10", "Hóa học 10", true);
        when(repository.findByCode(orgId, "HOA10")).thenReturn(Optional.of(existing));

        SubjectCodeCheckResponse resp = service.checkCode("HOA10", "sub-hoa");

        assertThat(resp.available()).isTrue();
    }

    @Test
    @DisplayName("check-code ném CODE_REQUIRED khi truyền code rỗng/null")
    void checkCodeBlankThrowsException() {
        assertThatThrownBy(() -> service.checkCode("   ", null))
            .isInstanceOf(AppException.class)
            .satisfies(e -> assertThat(((AppException) e).getErrorCode()).isEqualTo(ErrorCode.CODE_REQUIRED));
    }

    @Test
    @DisplayName("TC-SUB-018: Lấy thông tin usage môn học")
    void getUsageSuccess() {
        SubjectUsageResponse usage = new SubjectUsageResponse("sub-1", 1,
            List.of(new SubjectUsageResponse.SubjectClassUsageItem("cls-1", "C10A", "Lớp 10A", "DANG_DIEN_RA")));
        when(repository.getUsage("sub-1", orgId)).thenReturn(usage);

        SubjectUsageResponse result = service.getUsage("sub-1");

        assertThat(result.classesUsingSubject()).isEqualTo(1);
        assertThat(result.classes()).hasSize(1);
        verify(moduleGuard).requireModuleReadable(orgId, "STUDENT_MANAGEMENT");
    }

    @Test
    @DisplayName("TC-SUB-010 & D-13: Lấy danh sách môn học trả List không phân trang")
    void listReturnsArray() {
        when(actor.owner()).thenReturn(false);
        when(actor.hasPermission("subject.manage")).thenReturn(false);
        when(repository.list(orgId, null, false)).thenReturn(List.of(
            sampleSubject("sub-1", "TOAN", "Toán", true),
            sampleSubject("sub-2", "VAN", "Văn", true)
        ));

        List<SubjectResponse> result = service.list(null, true);

        assertThat(result).hasSize(2);
        // includeInactive is false because user is not owner and has no subject.manage
        verify(repository).list(orgId, null, false);
    }
}
