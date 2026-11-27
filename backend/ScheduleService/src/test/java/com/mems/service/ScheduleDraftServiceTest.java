package com.mems.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mems.client.ClassInfo;
import com.mems.client.ClassSubjectInfo;
import com.mems.client.EligibleTeacherInfo;
import com.mems.client.FacilityClient;
import com.mems.client.PeopleClient;
import com.mems.client.RoomInfo;
import com.mems.dto.ScheduleDraftConfirmResponse;
import com.mems.dto.ScheduleDraftDetailResponse;
import com.mems.dto.ScheduleDraftItemResponse;
import com.mems.dto.ScheduleDraftPatchRequest;
import com.mems.dto.ScheduleDraftRequest;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.ClassSlotRuleRepository;
import com.mems.repository.ScheduleDraftRepository;
import com.mems.repository.TeacherAvailabilityRepository;
import com.mems.repository.TimeSlotRepository;
import com.mems.schedule.TimeSlot;
import com.mems.scheduling.AutoScheduleSolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@JdbcTest
// Tắt transaction bao ngoài để transaction thật của confirm() có thể rollback và quan sát được.
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class ScheduleDraftServiceTest {
    private static final String ORG = "org-1";
    private static final String OTHER_ORG = "org-2";
    private static final String DEPT = "dept-1";
    private static final String CLASS_ID = "class-1";
    private static final String SUBJECT_ID = "sub-1";
    private static final String TEACHER_ID = "teacher-1";
    private static final LocalDate MONDAY = LocalDate.of(2026, 11, 30);

    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private PlatformTransactionManager transactionManager;

    @MockBean
    private PeopleClient people;
    @MockBean
    private FacilityClient facility;

    private ScheduleService scheduleService;
    private ScheduleDraftService service;

    @BeforeEach
    void setUp() {
        cleanTables();
        ObjectMapper mapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        TimeSlotRepository timeSlots = new TimeSlotRepository(jdbc);
        ClassSlotRuleRepository classRules = new ClassSlotRuleRepository(jdbc);
        TeacherAvailabilityRepository availability = new TeacherAvailabilityRepository(jdbc);
        ScheduleDraftRepository drafts = new ScheduleDraftRepository(jdbc);
        scheduleService = new ScheduleService(jdbc, people, facility);
        SchedulingRequirementBuilder builder =
            new SchedulingRequirementBuilder(people, scheduleService);
        DraftItemValidator validator = new DraftItemValidator(timeSlots, classRules, availability,
            scheduleService, people);
        service = new ScheduleDraftService(drafts, builder, new AutoScheduleSolver(), timeSlots,
            classRules, availability, scheduleService, validator, people, facility, mapper,
            transactionManager);

        insertSlots(timeSlots);
        stubPeople();
        stubFacility();
    }

    @Test
    @DisplayName("Tạo lịch nháp: có buổi dự kiến nhưng KHÔNG ghi bảng session")
    void createDraftLeavesSessionsUntouched() {
        ScheduleDraftDetailResponse detail = service.create(ORG, DEPT, "user-1", request());

        assertThat(detail.status()).isEqualTo("DRAFT");
        assertThat(detail.items()).hasSize(2);
        assertThat(detail.items()).allSatisfy(item -> {
            assertThat(item.classId()).isEqualTo(CLASS_ID);
            assertThat(item.subjectId()).isEqualTo(SUBJECT_ID);
            assertThat(item.teacherId()).isEqualTo(TEACHER_ID);
            assertThat(item.roomId()).isNotBlank();
            assertThat(item.weekNo()).isEqualTo(1);
            assertThat(item.periods()).isNotEmpty();
        });
        assertThat(detail.unscheduled()).isEmpty();
        assertThat(count("session")).isZero();
        assertThat(service.list(ORG, DEPT, null)).singleElement()
            .satisfies(summary -> assertThat(summary.itemCount()).isEqualTo(2));
    }

    @Test
    @DisplayName("Facility không phản hồi: vẫn tạo lịch nháp, buổi để trống phòng")
    void createDraftWhenFacilityUnavailableLeavesRoomsEmpty() {
        when(facility.roomsOfOrg(ORG)).thenThrow(new AppException(ErrorCode.FACILITY_UNAVAILABLE));

        ScheduleDraftDetailResponse detail = service.create(ORG, DEPT, "user-1", request());

        assertThat(detail.status()).isEqualTo("DRAFT");
        assertThat(detail.items()).hasSize(2);
        assertThat(detail.items()).allSatisfy(item -> {
            assertThat(item.roomId()).isNull();
            assertThat(item.roomCode()).isNull();
            assertThat(item.periods()).isNotEmpty();
        });
        assertThat(detail.unscheduled()).isEmpty();
    }

    @Test
    @DisplayName("Facility không phản hồi: xác nhận lịch nháp vẫn tạo buổi (không phòng)")
    void confirmCreatesSessionsWithoutRoomWhenFacilityUnavailable() {
        when(facility.roomsOfOrg(ORG)).thenThrow(new AppException(ErrorCode.FACILITY_UNAVAILABLE));
        ScheduleDraftDetailResponse detail = service.create(ORG, DEPT, "user-1", request());

        ScheduleDraftConfirmResponse result = service.confirm(ORG, DEPT, detail.id());

        assertThat(result.created()).isEqualTo(2);
        assertThat(result.failed()).isEmpty();
        assertThat(jdbc.queryForList("SELECT room_id FROM session", String.class))
            .containsOnlyNulls();
    }

    @Test
    @DisplayName("Lớp chưa có môn học trong chương trình: báo lỗi thay vì lưu lịch nháp rỗng")
    void rejectsClassesWithoutSubjects() {
        when(people.classSubjects(ORG, CLASS_ID)).thenReturn(List.of());

        assertThatThrownBy(() -> service.create(ORG, DEPT, "user-1", request()))
            .isInstanceOfSatisfying(AppException.class, ex ->
                assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
        assertThat(count("schedule_draft")).isZero();
    }

    @Test
    @DisplayName("Sửa tay phòng hợp lệ: lưu và đánh dấu is_manual_edit")
    void patchValidRoomMarksManualEdit() {
        ScheduleDraftDetailResponse detail = service.create(ORG, DEPT, "user-1", request());
        ScheduleDraftItemResponse item = detail.items().get(0);

        ScheduleDraftItemResponse patched = service.patchItem(ORG, DEPT, detail.id(), item.id(),
            new ScheduleDraftPatchRequest("room-2", null, null, null));

        assertThat(patched.roomId()).isEqualTo("room-2");
        assertThat(patched.roomCode()).isEqualTo("R2");
        assertThat(patched.manualEdit()).isTrue();
    }

    @Test
    @DisplayName("Sửa tay trùng giáo viên với buổi thật: từ chối và không lưu")
    void patchConflictRejectedWithoutSaving() {
        ScheduleDraftDetailResponse detail = service.create(ORG, DEPT, "user-1", request());
        ScheduleDraftItemResponse item = detail.items().get(0);
        insertClassMirror();
        insertSession("session-clash", TEACHER_ID, "room-9", item.startTime(), item.endTime());

        assertThatThrownBy(() -> service.patchItem(ORG, DEPT, detail.id(), item.id(),
            new ScheduleDraftPatchRequest("room-2", null, null, null)))
            .isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.TEACHER_SCHEDULE_CONFLICT));

        ScheduleDraftItemResponse unchanged = service.detail(ORG, DEPT, detail.id(), 1)
            .items().stream().filter(row -> row.id().equals(item.id())).findFirst().orElseThrow();
        assertThat(unchanged.roomId()).isEqualTo(item.roomId());
        assertThat(unchanged.manualEdit()).isFalse();
    }

    @Test
    @DisplayName("Xác nhận: tạo buổi thật kèm subject_id và chuyển lịch nháp sang CONFIRMED")
    void confirmCreatesSessionsWithSubjectId() {
        ScheduleDraftDetailResponse detail = service.create(ORG, DEPT, "user-1", request());

        ScheduleDraftConfirmResponse result = service.confirm(ORG, DEPT, detail.id());

        assertThat(result.created()).isEqualTo(2);
        assertThat(result.failed()).isEmpty();
        assertThat(count("session")).isEqualTo(2);
        assertThat(jdbc.queryForList("SELECT subject_id FROM session", String.class))
            .containsOnly(SUBJECT_ID);
        assertThat(service.detail(ORG, DEPT, detail.id(), 1).status()).isEqualTo("CONFIRMED");
        assertThat(scheduleService.list(ORG, DEPT, null, null, null)).hasSize(2);
    }

    @Test
    @DisplayName("Xác nhận thất bại: rollback toàn bộ, draft giữ DRAFT, không tạo buổi nào")
    void confirmFailureRollsBackEverything() {
        ScheduleDraftDetailResponse detail = service.create(ORG, DEPT, "user-1", request());
        ScheduleDraftItemResponse first = detail.items().get(0);
        insertClassMirror();
        insertSession("session-clash", TEACHER_ID, "room-9", first.startTime(), first.endTime());

        ScheduleDraftConfirmResponse result = service.confirm(ORG, DEPT, detail.id());

        assertThat(result.created()).isZero();
        assertThat(result.failed()).isNotEmpty();
        assertThat(count("session")).isEqualTo(1);
        assertThat(service.detail(ORG, DEPT, detail.id(), 1).status()).isEqualTo("DRAFT");
    }

    @Test
    @DisplayName("Xác nhận lần hai bị từ chối")
    void confirmTwiceRejected() {
        ScheduleDraftDetailResponse detail = service.create(ORG, DEPT, "user-1", request());
        service.confirm(ORG, DEPT, detail.id());

        assertThatThrownBy(() -> service.confirm(ORG, DEPT, detail.id()))
            .isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.SCHEDULE_DRAFT_NOT_EDITABLE));
    }

    @Test
    @DisplayName("Lịch nháp quá hạn xác nhận bị từ chối")
    void expiredDraftRejected() {
        ScheduleDraftDetailResponse detail = service.create(ORG, DEPT, "user-1", request());
        jdbc.update("UPDATE schedule_draft SET created_at=? WHERE id=?",
            Timestamp.from(Instant.now().minus(8, ChronoUnit.DAYS)), detail.id());

        assertThatThrownBy(() -> service.confirm(ORG, DEPT, detail.id()))
            .isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.SCHEDULE_DRAFT_EXPIRED));
    }

    @Test
    @DisplayName("Tổ chức khác không đọc được lịch nháp")
    void otherOrganizationCannotReadDraft() {
        ScheduleDraftDetailResponse detail = service.create(ORG, DEPT, "user-1", request());

        assertThatThrownBy(() -> service.detail(OTHER_ORG, DEPT, detail.id(), 1))
            .isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.SCHEDULE_DRAFT_NOT_FOUND));
    }

    @Test
    @DisplayName("Huỷ lịch nháp: chuyển DISCARDED và khoá sửa/xác nhận")
    void discardMarksDraftAndBlocksEdits() {
        ScheduleDraftDetailResponse detail = service.create(ORG, DEPT, "user-1", request());
        service.discard(ORG, DEPT, detail.id());

        assertThat(service.detail(ORG, DEPT, detail.id(), 1).status()).isEqualTo("DISCARDED");
        assertThatThrownBy(() -> service.patchItem(ORG, DEPT, detail.id(),
            detail.items().get(0).id(), new ScheduleDraftPatchRequest("room-2", null, null, null)))
            .isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.SCHEDULE_DRAFT_NOT_EDITABLE));
    }

    // ---------------------------------------------------------------- helpers

    private void cleanTables() {
        jdbc.execute("DELETE FROM schedule_draft_item");
        jdbc.execute("DELETE FROM schedule_draft_unscheduled");
        jdbc.execute("DELETE FROM schedule_draft");
        jdbc.execute("DELETE FROM session");
        jdbc.execute("DELETE FROM `class`");
        jdbc.execute("DELETE FROM class_slot_rule");
        jdbc.execute("DELETE FROM teacher_availability");
        jdbc.execute("DELETE FROM time_slot");
    }

    private ScheduleDraftRequest request() {
        return new ScheduleDraftRequest(List.of(CLASS_ID), MONDAY, MONDAY.plusDays(6), null);
    }

    private void insertSlots(TimeSlotRepository timeSlots) {
        Instant now = Instant.parse("2026-11-01T00:00:00Z");
        timeSlots.insert(ORG, new TimeSlot(null, 1, "T1", LocalTime.of(7, 0),
            LocalTime.of(7, 45), true, true), now);
        timeSlots.insert(ORG, new TimeSlot(null, 2, "T2", LocalTime.of(7, 45),
            LocalTime.of(8, 30), false, true), now);
        timeSlots.insert(ORG, new TimeSlot(null, 3, "T3", LocalTime.of(8, 40),
            LocalTime.of(9, 25), true, true), now);
        timeSlots.insert(ORG, new TimeSlot(null, 4, "T4", LocalTime.of(9, 25),
            LocalTime.of(10, 10), false, true), now);
    }

    private void stubPeople() {
        when(people.classInfo(ORG, CLASS_ID)).thenReturn(new ClassInfo(CLASS_ID, ORG, "C1",
            "Lớp 1", "DANG_DIEN_RA", "NONE", TEACHER_ID, "GV 1", MONDAY,
            LocalDate.of(2026, 12, 31), SUBJECT_ID, "Toán", 30));
        ClassSubjectInfo subject = new ClassSubjectInfo(CLASS_ID, SUBJECT_ID, "TOAN", "Toán",
            "CURRICULUM", "cur-1", 2, 2, 90, 2, 1, "cat-1", "ANY", TEACHER_ID, "GV 1",
            true, "PLANNED");
        when(people.classSubjects(ORG, CLASS_ID)).thenReturn(List.of(subject));
        when(people.eligibleTeachers(ORG, SUBJECT_ID)).thenReturn(
            List.of(new EligibleTeacherInfo(TEACHER_ID, "GV 1", DEPT)));
        when(people.teacherInfo(ORG, TEACHER_ID))
            .thenReturn(new EligibleTeacherInfo(TEACHER_ID, "GV 1", DEPT));
    }

    private void stubFacility() {
        when(facility.roomsOfOrg(ORG)).thenReturn(List.of(
            new RoomInfo("room-1", "R1", "Phòng 1", 40, "active", DEPT, 0, "classroom"),
            new RoomInfo("room-2", "R2", "Phòng 2", 45, "active", DEPT, 0, "classroom")));
        when(facility.room(anyString(), anyString())).thenAnswer(invocation ->
            switch ((String) invocation.getArgument(1)) {
                case "room-1" -> new RoomInfo("room-1", "R1", "Phòng 1", 40, "active", DEPT, 0,
                    "classroom");
                case "room-2" -> new RoomInfo("room-2", "R2", "Phòng 2", 45, "active", DEPT, 0,
                    "classroom");
                default -> null;
            });
    }

    private void insertClassMirror() {
        jdbc.update("""
            INSERT INTO `class`(id, org_id, code, name, subject, max_size, start_date, end_date, status)
            VALUES (?,?,?,?,?,?,?,?,?)
            """, CLASS_ID, ORG, "C1", "Lớp 1", "Toán", 30, MONDAY,
            LocalDate.of(2026, 12, 31), "ongoing");
    }

    private void insertSession(String id, String teacherId, String roomId, Instant start,
                               Instant end) {
        jdbc.update("""
            INSERT INTO session(id, class_id, department_id, teacher_id, room_id, start_time,
                                end_time, status, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?, 'scheduled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, id, CLASS_ID, DEPT, teacherId, roomId, Timestamp.from(start),
            Timestamp.from(end));
    }

    private int count(String table) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Integer.class);
        return count == null ? 0 : count;
    }
}
