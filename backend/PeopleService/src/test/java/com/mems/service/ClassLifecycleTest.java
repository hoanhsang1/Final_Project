package com.mems.service;

import com.mems.dto.ClassCancelRequest;
import com.mems.dto.ClassCloseEventResponse;
import com.mems.dto.ClassCloseRejectRequest;
import com.mems.dto.ClassCloseRequest;
import com.mems.dto.ClassReopenRequest;
import com.mems.dto.ClassStatusLogResponse;
import com.mems.dto.ClassTeacherAssignRequest;
import com.mems.dto.SchoolClassResponse;
import com.mems.dto.SchoolClassUpdateRequest;
import com.mems.exception.AppException;
import com.mems.repository.ClassStatusRepository;
import com.mems.repository.SchoolClassRepository;
import com.mems.repository.StudentRepository;
import com.mems.repository.TeacherRepository;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@JdbcTest
class ClassLifecycleTest {
    private static final LocalDate TODAY = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    private static final Instant NOW = Instant.parse("2026-11-06T00:00:00Z");

    @Autowired
    private JdbcTemplate jdbc;

    private Actor actor;
    private SchoolClassRepository classes;
    private ClassStatusRepository statusRepository;
    private ClassStatusService statusService;
    private SchoolClassService classService;

    @BeforeEach
    void setUp() {
        actor = mock(Actor.class);
        when(actor.orgId()).thenReturn("org-1");
        when(actor.userId()).thenReturn("requester");

        OrganizationModuleGuard guard = mock(OrganizationModuleGuard.class);
        classes = new SchoolClassRepository(jdbc);
        statusRepository = new ClassStatusRepository(jdbc);
        statusService = new ClassStatusService(statusRepository, classes, actor, guard);
        classService = new SchoolClassService(classes, mock(StudentRepository.class), actor, guard,
            mock(PeopleAuditService.class), mock(TeacherRepository.class), statusService,
            "TEACHER_ASSIGNMENT");
    }

    @Test
    @DisplayName("AC-19.01/02 Job tự chuyển trạng thái theo ngày và chạy lại không ghi nhật ký thừa")
    void automaticTransitionsAreIdempotent() {
        insertClass("class-start", "CHUA_BAT_DAU", "NONE", TODAY, TODAY.plusDays(10), 0);
        insertClass("class-end", "DANG_DIEN_RA", "NONE",
            TODAY.minusDays(10), TODAY.minusDays(1), 0);

        statusService.refreshOrganization("org-1");
        statusService.refreshOrganization("org-1");

        assertThat(classes.require("class-start", "org-1", false).status()).isEqualTo("DANG_DIEN_RA");
        assertThat(classes.require("class-end", "org-1", false).status()).isEqualTo("DA_KET_THUC");
        assertThat(statusRepository.statusLogs("class-start", "org-1")).hasSize(1);
        assertThat(statusRepository.statusLogs("class-end", "org-1")).hasSize(1);
        ClassStatusLogResponse log = statusRepository.statusLogs("class-end", "org-1").get(0);
        assertThat(log.fromStatus()).isEqualTo("DANG_DIEN_RA");
        assertThat(log.toStatus()).isEqualTo("DA_KET_THUC");
        assertThat(log.changedBy()).isNull();
    }

    @Test
    @DisplayName("AC-19.01 Chỉ gọi GET cũng làm mới trạng thái, không cần chờ job")
    void getTriggersRefresh() {
        insertClass("class-start", "CHUA_BAT_DAU", "NONE", TODAY, null, 0);

        SchoolClassResponse found = classService.get("class-start");

        assertThat(found.status()).isEqualTo("DANG_DIEN_RA");
        assertThat(statusRepository.statusLogs("class-start", "org-1")).hasSize(1);
    }

    @Test
    @DisplayName("AC-19.04 Hủy thiếu lý do bị từ chối và không lưu")
    void cancelRequiresReason() {
        insertClass("class-1", "CHUA_BAT_DAU", "NONE", null, null, 0);

        assertThatThrownBy(() -> statusService.cancel("class-1", new ClassCancelRequest("   ", 0L)))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> {
                AppException api = (AppException) ex;
                assertThat(api.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                assertThat(api.getCode()).isEqualTo("VALIDATION_ERROR");
            });
        assertThat(classes.require("class-1", "org-1", false).status()).isEqualTo("CHUA_BAT_DAU");
        assertThat(statusRepository.statusLogs("class-1", "org-1")).isEmpty();
    }

    @Test
    @DisplayName("AC-19.05/07 Hủy từ CHUA_BAT_DAU và DANG_DIEN_RA, mỗi lần đúng 1 nhật ký")
    void cancelsFromBothAllowedStatuses() {
        insertClass("class-new", "CHUA_BAT_DAU", "NONE", null, null, 0);
        insertClass("class-running", "DANG_DIEN_RA", "NONE", null, null, 0);

        statusService.cancel("class-new", new ClassCancelRequest("  Trùng lịch  ", 0L));
        SchoolClassResponse cancelled = statusService.cancel("class-running",
            new ClassCancelRequest("Hết học sinh", 0L));

        assertThat(classes.require("class-new", "org-1", false).status()).isEqualTo("DA_HUY");
        assertThat(cancelled.status()).isEqualTo("DA_HUY");
        ClassStatusLogResponse log = statusRepository.statusLogs("class-new", "org-1").get(0);
        assertThat(log.fromStatus()).isEqualTo("CHUA_BAT_DAU");
        assertThat(log.toStatus()).isEqualTo("DA_HUY");
        assertThat(log.reason()).isEqualTo("Trùng lịch");
        assertThat(log.changedBy()).isEqualTo("requester");
        assertThat(statusRepository.statusLogs("class-running", "org-1")).hasSize(1);
    }

    @Test
    @DisplayName("AC-19.06 Không hủy được lớp đã kết thúc hoặc đã hủy")
    void rejectsCancelForFinishedOrCancelledClasses() {
        insertClass("class-finished", "DA_KET_THUC", "NONE", null, null, 0);
        insertClass("class-cancelled", "DA_HUY", "NONE", null, null, 0);

        assertClassNotCancellable("class-finished");
        assertClassNotCancellable("class-cancelled");
    }

    @Test
    @DisplayName("AC-19.12/13 Sai version khi hủy: 409 STATUS_CHANGED, không ghi đè")
    void staleCancelDoesNotOverwrite() {
        insertClass("class-1", "CHUA_BAT_DAU", "NONE", null, null, 3);

        assertThatThrownBy(() -> statusService.cancel("class-1", new ClassCancelRequest("Lý do", 2L)))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> {
                AppException api = (AppException) ex;
                assertThat(api.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                assertThat(api.getCode()).isEqualTo("STATUS_CHANGED");
            });
        assertThat(classes.require("class-1", "org-1", false).status()).isEqualTo("CHUA_BAT_DAU");
        assertThat(classes.require("class-1", "org-1", false).version()).isEqualTo(3);
        assertThat(statusRepository.statusLogs("class-1", "org-1")).isEmpty();
    }

    @Test
    @DisplayName("AC-19.10 selectable=true loại lớp kết thúc, đã hủy, đã đóng; danh sách thường vẫn thấy")
    void selectableExcludesUnavailableClasses() {
        insertClass("class-open", "CHUA_BAT_DAU", "NONE", null, null, 0);
        insertClass("class-pending", "DANG_DIEN_RA", "PENDING", null, null, 0);
        insertClass("class-finished", "DA_KET_THUC", "NONE", null, null, 0);
        insertClass("class-cancelled", "DA_HUY", "NONE", null, null, 0);
        insertClass("class-closed", "DANG_DIEN_RA", "CLOSED", null, null, 0);

        assertThat(codes(classes.list("org-1", 1, 20, null, null, true)))
            .containsExactlyInAnyOrder("class-open", "class-pending");
        assertThat(codes(classes.list("org-1", 1, 20, null, null, false))).hasSize(5);
    }

    @Test
    @DisplayName("Đóng lớp: yêu cầu → PENDING → duyệt CLOSED → mở lại NONE, mỗi bước có sự kiện")
    void closeApproveAndReopenWorkflow() {
        insertClass("class-1", "DANG_DIEN_RA", "NONE", null, null, 0);

        SchoolClassResponse requested = statusService.requestClose("class-1", new ClassCloseRequest("  Hết khoá  "));
        assertThat(requested.closeState()).isEqualTo("PENDING");

        when(actor.userId()).thenReturn("approver");
        SchoolClassResponse approved = statusService.approveClose("class-1");
        assertThat(approved.closeState()).isEqualTo("CLOSED");

        SchoolClassResponse reopened = statusService.reopen("class-1", new ClassReopenRequest("Mở lại"));
        assertThat(reopened.closeState()).isEqualTo("NONE");

        List<ClassCloseEventResponse> events = statusRepository.closeEvents("class-1", "org-1");
        assertThat(events).extracting(ClassCloseEventResponse::action)
            .containsExactly("REQUESTED", "APPROVED", "REOPENED");
        assertThat(events.get(0).reason()).isEqualTo("Hết khoá");
    }

    @Test
    @DisplayName("Từ chối đóng cần lý do và đưa close_state về NONE")
    void rejectCloseRequiresReason() {
        insertClass("class-1", "DANG_DIEN_RA", "PENDING", null, null, 0);
        insertEvent("event-1", "class-1", "REQUESTED", "requester", NOW);
        when(actor.userId()).thenReturn("approver");

        assertThatThrownBy(() -> statusService.rejectClose("class-1", new ClassCloseRejectRequest("  ")))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));

        SchoolClassResponse rejected = statusService.rejectClose("class-1",
            new ClassCloseRejectRequest("Chưa đủ điều kiện"));
        assertThat(rejected.closeState()).isEqualTo("NONE");
        assertThat(statusRepository.closeEvents("class-1", "org-1"))
            .extracting(ClassCloseEventResponse::action).contains("REJECTED");
    }

    @Test
    @DisplayName("Không duyệt được khi chưa PENDING; không yêu cầu đóng lớp DA_HUY")
    void closeRulesAreEnforced() {
        insertClass("class-none", "DANG_DIEN_RA", "NONE", null, null, 0);
        insertClass("class-cancelled", "DA_HUY", "NONE", null, null, 0);

        assertThatThrownBy(() -> statusService.approveClose("class-none"))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("CLOSE_STATE_CHANGED"));

        assertThatThrownBy(() -> statusService.requestClose("class-cancelled", new ClassCloseRequest(null)))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("CLASS_NOT_CLOSABLE"));
    }

    @Test
    @DisplayName("Người yêu cầu không được tự duyệt")
    void requesterCannotApproveOwnRequest() {
        insertClass("class-1", "DANG_DIEN_RA", "NONE", null, null, 0);
        statusService.requestClose("class-1", new ClassCloseRequest(null));

        assertThatThrownBy(() -> statusService.approveClose("class-1"))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> {
                AppException api = (AppException) ex;
                assertThat(api.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
                assertThat(api.getCode()).isEqualTo("SELF_APPROVAL_NOT_ALLOWED");
            });
        assertThat(classes.require("class-1", "org-1", false).closeState()).isEqualTo("PENDING");
    }

    @Test
    @DisplayName("Lớp CLOSED chỉ xem: chặn sửa và gán giáo viên, vẫn đọc được")
    void closedClassIsReadOnly() {
        insertClass("class-1", "DANG_DIEN_RA", "CLOSED", null, null, 0);

        assertThat(classes.require("class-1", "org-1", false).closeState()).isEqualTo("CLOSED");
        assertThatThrownBy(() -> classService.update("class-1",
            new SchoolClassUpdateRequest("New name", null, null, null, 0L)))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("CLASS_NOT_EDITABLE"));
        assertThatThrownBy(() -> classService.assignTeacher("class-1",
            new ClassTeacherAssignRequest("teacher-1", 0L)))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("CLASS_NOT_ASSIGNABLE"));
    }

    @Test
    @DisplayName("Sửa lớp sai version: 409 STATUS_CHANGED, không ghi đè")
    void updateRejectsStaleVersion() {
        insertClass("class-1", "CHUA_BAT_DAU", "NONE", null, null, 0);

        assertThatThrownBy(() -> classService.update("class-1",
            new SchoolClassUpdateRequest("Changed", null, null, null, 5L)))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> {
                AppException api = (AppException) ex;
                assertThat(api.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                assertThat(api.getCode()).isEqualTo("STATUS_CHANGED");
            });
        assertThat(classes.require("class-1", "org-1", false).name()).isEqualTo("Class class-1");
    }

    @Test
    @DisplayName("Sửa lớp đúng version tăng version và cập nhật ngày")
    void updateBumpsVersionAndDates() {
        insertClass("class-1", "CHUA_BAT_DAU", "NONE", null, null, 0);

        SchoolClassResponse updated = classService.update("class-1",
            new SchoolClassUpdateRequest("  Lớp mới  ", "2026-2027", TODAY, TODAY.plusDays(30), 0L));

        assertThat(updated.name()).isEqualTo("Lớp mới");
        assertThat(updated.startDate()).isEqualTo(TODAY);
        assertThat(updated.endDate()).isEqualTo(TODAY.plusDays(30));
        assertThat(updated.version()).isEqualTo(1);
    }

    @Test
    @DisplayName("Ngày kết thúc trước ngày bắt đầu: 400")
    void rejectsInvalidDateRange() {
        insertClass("class-1", "CHUA_BAT_DAU", "NONE", null, null, 0);

        assertThatThrownBy(() -> classService.update("class-1",
            new SchoolClassUpdateRequest("Name", null, TODAY, TODAY.minusDays(1), 0L)))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    private void assertClassNotCancellable(String id) {
        assertThatThrownBy(() -> statusService.cancel(id, new ClassCancelRequest("Lý do", 0L)))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> {
                AppException api = (AppException) ex;
                assertThat(api.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                assertThat(api.getCode()).isEqualTo("CLASS_NOT_CANCELLABLE");
            });
    }

    @SuppressWarnings("unchecked")
    private List<String> codes(Map<String, Object> page) {
        return ((List<SchoolClassResponse>) page.get("items")).stream().map(SchoolClassResponse::id).toList();
    }

    private void insertClass(String id, String status, String closeState,
                             LocalDate startDate, LocalDate endDate, long version) {
        jdbc.update("""
            INSERT INTO school_class(id,org_id,class_code,name,status,start_date,end_date,
                                     close_state,version,created_by,created_at)
            VALUES (?, 'org-1', ?, ?, ?, ?, ?, ?, ?, 'owner', ?)
            """, id, id.toUpperCase(), "Class " + id, status,
            startDate != null ? Date.valueOf(startDate) : null,
            endDate != null ? Date.valueOf(endDate) : null,
            closeState, version, Timestamp.from(NOW));
    }

    private void insertEvent(String id, String classId, String action, String actorId, Instant at) {
        jdbc.update("""
            INSERT INTO class_close_event(id,class_id,org_id,action,actor_id,reason,created_at)
            VALUES (?,?,'org-1',?,?,NULL,?)
            """, id, classId, action, actorId, Timestamp.from(at));
    }
}
