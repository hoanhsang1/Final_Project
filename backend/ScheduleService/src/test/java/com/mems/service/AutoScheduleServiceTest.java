package com.mems.service;

import com.mems.client.ClassInfo;
import com.mems.client.EligibleTeacherInfo;
import com.mems.client.FacilityClient;
import com.mems.client.PeopleClient;
import com.mems.client.RoomInfo;
import com.mems.dto.AutoScheduleRequest;
import com.mems.dto.AutoScheduleResult;
import com.mems.dto.ScheduleRequest;
import com.mems.dto.ScheduleResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.time.SchoolClock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AutoScheduleServiceTest {

    private static final String ORG = "org-1";
    private static final String DEPT = "dept-1";

    @Mock
    private ScheduleService scheduleService;
    @Mock
    private PeopleClient people;
    @Mock
    private FacilityClient facility;
    @Mock
    private SchoolClock schoolClock;

    @InjectMocks
    private AutoScheduleService autoScheduleService;

    private AutoScheduleRequest sampleRequest;

    @BeforeEach
    void setUp() {
        sampleRequest = new AutoScheduleRequest(
            List.of("class-1"),
            LocalDate.of(2026, 11, 23), // Monday
            LocalDate.of(2026, 11, 23),
            List.of(new AutoScheduleRequest.TimeSlot(LocalTime.of(8, 0), LocalTime.of(9, 30))),
            List.of(1) // Monday only
        );
    }

    @Test
    @DisplayName("TC-AUTO-001: Xếp lịch thành công cho lớp hợp lệ")
    void testAutoScheduleSuccess() {
        ClassInfo classInfo = new ClassInfo("class-1", ORG, "C1", "Lớp 1", "DANG_DIEN_RA", "NONE",
            "teacher-1", "Giáo viên 1", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), "subj-1", "Toán", 20);
        when(people.classInfo(ORG, "class-1")).thenReturn(classInfo);
        when(people.classSubjects(ORG, "class-1")).thenReturn(List.of());
        when(scheduleService.countScheduledSessions(eq(ORG), eq("class-1"), any())).thenReturn(0);

        RoomInfo room = new RoomInfo("room-1", "R101", "Phòng 101", 30, "active", DEPT, 0);
        when(facility.rooms(ORG, DEPT)).thenReturn(List.of(room));

        ScheduleResponse session = new ScheduleResponse("sess-1", "class-1", "Lớp 1", "teacher-1",
            "room-1", Instant.now(), Instant.now().plusSeconds(5400), "scheduled", DEPT);
        when(scheduleService.create(eq(ORG), eq(DEPT), any(ScheduleRequest.class))).thenReturn(session);

        AutoScheduleResult result = autoScheduleService.generate(ORG, DEPT, sampleRequest);

        assertThat(result.summary().totalRequested()).isEqualTo(1);
        assertThat(result.summary().scheduled()).isEqualTo(1);
        assertThat(result.summary().unscheduled()).isEqualTo(0);
        assertThat(result.scheduled()).hasSize(1);
        assertThat(result.unscheduled()).isEmpty();
    }

    @Test
    @DisplayName("TC-AUTO-010: Facility không phản hồi -> báo chưa có phòng thay vì lỗi 500")
    void testFacilityUnavailableReportsNoRoom() {
        ClassInfo classInfo = new ClassInfo("class-1", ORG, "C1", "Lớp 1", "DANG_DIEN_RA", "NONE",
            "teacher-1", "Giáo viên 1", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31),
            "subj-1", "Toán", 20);
        when(people.classInfo(ORG, "class-1")).thenReturn(classInfo);
        when(people.classSubjects(ORG, "class-1")).thenReturn(List.of());
        when(scheduleService.countScheduledSessions(eq(ORG), eq("class-1"), any())).thenReturn(0);
        when(facility.rooms(ORG, DEPT)).thenThrow(new AppException(ErrorCode.FACILITY_UNAVAILABLE));

        AutoScheduleResult result = autoScheduleService.generate(ORG, DEPT, sampleRequest);

        assertThat(result.summary().scheduled()).isEqualTo(0);
        assertThat(result.summary().unscheduled()).isEqualTo(1);
        assertThat(result.unscheduled().get(0).reason()).contains("Không có phòng học khả dụng");
    }

    @Test
    @DisplayName("TC-AUTO-002: Lớp không tồn tại -> unscheduled với lý do")
    void testClassNotFound() {
        when(people.classInfo(ORG, "class-1")).thenReturn(null);

        AutoScheduleResult result = autoScheduleService.generate(ORG, DEPT, sampleRequest);

        assertThat(result.summary().totalRequested()).isEqualTo(1);
        assertThat(result.summary().scheduled()).isEqualTo(0);
        assertThat(result.summary().unscheduled()).isEqualTo(1);
        assertThat(result.unscheduled().get(0).reason()).contains("không tồn tại");
    }

    @Test
    @DisplayName("TC-AUTO-003: Lớp chưa có giáo viên và không có subjectId -> unscheduled với lý do")
    void testClassWithoutTeacherAndSubject() {
        // Dùng constructor backward-compatible (không có subjectId → subjectId=null)
        ClassInfo classInfo = new ClassInfo("class-1", ORG, "C1", "Lớp 1", "DANG_DIEN_RA", "NONE",
            null, null, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), "Toán", 20);
        when(people.classInfo(ORG, "class-1")).thenReturn(classInfo);

        AutoScheduleResult result = autoScheduleService.generate(ORG, DEPT, sampleRequest);

        assertThat(result.summary().scheduled()).isEqualTo(0);
        assertThat(result.summary().unscheduled()).isEqualTo(1);
        // Lý do phải đề cập đến việc chưa có giáo viên hoặc môn học
        assertThat(result.unscheduled().get(0).reason()).contains("chưa có giáo viên");
    }

    @Test
    @DisplayName("TC-AUTO-008: Lớp có subjectId nhưng chưa assign teacher -> tìm eligible qua D-06 -> xếp được")
    void testClassWithSubjectIdNoAssignedTeacher() {
        // Lớp có subjectId nhưng không có assigned teacher
        ClassInfo classInfo = new ClassInfo("class-1", ORG, "C1", "Lớp 1", "DANG_DIEN_RA", "NONE",
            null, null, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31),
            "subj-1", "Toán", 20);
        when(people.classInfo(ORG, "class-1")).thenReturn(classInfo);

        // people.eligibleTeachers trả về 1 giáo viên đủ điều kiện (nguồn teacher_subject D-06)
        EligibleTeacherInfo eligibleTeacher = new EligibleTeacherInfo("teacher-99", "GV Đủ Điều Kiện", DEPT);
        when(people.eligibleTeachers(ORG, "subj-1")).thenReturn(List.of(eligibleTeacher));

        RoomInfo room = new RoomInfo("room-1", "R101", "Phòng 101", 30, "active", DEPT, 0);
        when(facility.rooms(ORG, DEPT)).thenReturn(List.of(room));

        ScheduleResponse session = new ScheduleResponse("sess-8", "class-1", "Lớp 1", "teacher-99",
            "room-1", Instant.now(), Instant.now().plusSeconds(5400), "scheduled", DEPT);
        when(scheduleService.create(eq(ORG), eq(DEPT), any(ScheduleRequest.class))).thenReturn(session);

        AutoScheduleResult result = autoScheduleService.generate(ORG, DEPT, sampleRequest);

        assertThat(result.summary().totalRequested()).isEqualTo(1);
        assertThat(result.summary().scheduled()).isEqualTo(1);
        assertThat(result.summary().unscheduled()).isEqualTo(0);
        assertThat(result.scheduled()).hasSize(1);
        // Xác nhận eligibleTeachers được gọi đúng với subjectId
        verify(people).eligibleTeachers(ORG, "subj-1");
    }

    @Test
    @DisplayName("TC-AUTO-009: Lớp có subjectId nhưng không có eligible teacher nào -> unscheduled với lý do")
    void testClassWithSubjectIdButNoEligibleTeacher() {
        ClassInfo classInfo = new ClassInfo("class-1", ORG, "C1", "Lớp 1", "DANG_DIEN_RA", "NONE",
            null, null, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31),
            "subj-1", "Toán", 20);
        when(people.classInfo(ORG, "class-1")).thenReturn(classInfo);

        // Không có giáo viên nào đủ điều kiện dạy môn này
        when(people.eligibleTeachers(ORG, "subj-1")).thenReturn(List.of());

        AutoScheduleResult result = autoScheduleService.generate(ORG, DEPT, sampleRequest);

        assertThat(result.summary().scheduled()).isEqualTo(0);
        assertThat(result.summary().unscheduled()).isEqualTo(1);
        assertThat(result.unscheduled().get(0).reason()).contains("Không có giáo viên đủ điều kiện");
        assertThat(result.unscheduled().get(0).reason()).contains("Toán");
        verify(people).eligibleTeachers(ORG, "subj-1");
    }

    @Test
    @DisplayName("TC-AUTO-004: Không có phòng học khả dụng -> unscheduled")
    void testNoAvailableRooms() {
        ClassInfo classInfo = new ClassInfo("class-1", ORG, "C1", "Lớp 1", "DANG_DIEN_RA", "NONE",
            "teacher-1", "Giáo viên 1", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), "subj-1", "Toán", 20);
        when(people.classInfo(ORG, "class-1")).thenReturn(classInfo);
        when(people.classSubjects(ORG, "class-1")).thenReturn(List.of());
        when(scheduleService.countScheduledSessions(eq(ORG), eq("class-1"), any())).thenReturn(0);
        when(facility.rooms(ORG, DEPT)).thenReturn(List.of());

        AutoScheduleResult result = autoScheduleService.generate(ORG, DEPT, sampleRequest);

        assertThat(result.summary().scheduled()).isEqualTo(0);
        assertThat(result.summary().unscheduled()).isEqualTo(1);
        assertThat(result.unscheduled().get(0).reason()).contains("Không có phòng");
    }

    @Test
    @DisplayName("TC-AUTO-005: Xung đột lịch giáo viên -> unscheduled với giải thích cụ thể")
    void testTeacherScheduleConflict() {
        ClassInfo classInfo = new ClassInfo("class-1", ORG, "C1", "Lớp 1", "DANG_DIEN_RA", "NONE",
            "teacher-1", "Giáo viên 1", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), "subj-1", "Toán", 20);
        when(people.classInfo(ORG, "class-1")).thenReturn(classInfo);
        when(people.classSubjects(ORG, "class-1")).thenReturn(List.of());
        when(scheduleService.countScheduledSessions(eq(ORG), eq("class-1"), any())).thenReturn(0);

        RoomInfo room = new RoomInfo("room-1", "R101", "Phòng 101", 30, "active", DEPT, 0);
        when(facility.rooms(ORG, DEPT)).thenReturn(List.of(room));

        when(scheduleService.create(eq(ORG), eq(DEPT), any(ScheduleRequest.class)))
            .thenThrow(new AppException(ErrorCode.TEACHER_SCHEDULE_CONFLICT));

        AutoScheduleResult result = autoScheduleService.generate(ORG, DEPT, sampleRequest);

        assertThat(result.summary().scheduled()).isEqualTo(0);
        assertThat(result.summary().unscheduled()).isEqualTo(1);
        assertThat(result.unscheduled().get(0).reason()).contains("Giáo viên đã có lịch");
    }

    @Test
    @DisplayName("TC-AUTO-006: Xung đột lịch phòng -> unscheduled với giải thích cụ thể")
    void testRoomScheduleConflict() {
        ClassInfo classInfo = new ClassInfo("class-1", ORG, "C1", "Lớp 1", "DANG_DIEN_RA", "NONE",
            "teacher-1", "Giáo viên 1", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), "subj-1", "Toán", 20);
        when(people.classInfo(ORG, "class-1")).thenReturn(classInfo);
        when(people.classSubjects(ORG, "class-1")).thenReturn(List.of());
        when(scheduleService.countScheduledSessions(eq(ORG), eq("class-1"), any())).thenReturn(0);

        RoomInfo room = new RoomInfo("room-1", "R101", "Phòng 101", 30, "active", DEPT, 0);
        when(facility.rooms(ORG, DEPT)).thenReturn(List.of(room));

        when(scheduleService.create(eq(ORG), eq(DEPT), any(ScheduleRequest.class)))
            .thenThrow(new AppException(ErrorCode.ROOM_SCHEDULE_CONFLICT));

        AutoScheduleResult result = autoScheduleService.generate(ORG, DEPT, sampleRequest);

        assertThat(result.summary().scheduled()).isEqualTo(0);
        assertThat(result.summary().unscheduled()).isEqualTo(1);
        assertThat(result.unscheduled().get(0).reason()).contains("Phòng đã được đặt");
    }

    @Test
    @DisplayName("TC-AUTO-007: Xung đột lịch lớp -> unscheduled với giải thích cụ thể")
    void testClassScheduleConflict() {
        ClassInfo classInfo = new ClassInfo("class-1", ORG, "C1", "Lớp 1", "DANG_DIEN_RA", "NONE",
            "teacher-1", "Giáo viên 1", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), "subj-1", "Toán", 20);
        when(people.classInfo(ORG, "class-1")).thenReturn(classInfo);
        when(people.classSubjects(ORG, "class-1")).thenReturn(List.of());
        when(scheduleService.countScheduledSessions(eq(ORG), eq("class-1"), any())).thenReturn(0);

        RoomInfo room = new RoomInfo("room-1", "R101", "Phòng 101", 30, "active", DEPT, 0);
        when(facility.rooms(ORG, DEPT)).thenReturn(List.of(room));

        when(scheduleService.create(eq(ORG), eq(DEPT), any(ScheduleRequest.class)))
            .thenThrow(new AppException(ErrorCode.CLASS_SCHEDULE_CONFLICT));

        AutoScheduleResult result = autoScheduleService.generate(ORG, DEPT, sampleRequest);

        assertThat(result.summary().scheduled()).isEqualTo(0);
        assertThat(result.summary().unscheduled()).isEqualTo(1);
        assertThat(result.unscheduled().get(0).reason()).contains("Lớp đã có buổi học");
    }
}
