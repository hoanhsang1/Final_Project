package com.mems.service;

import com.mems.client.ClassInfo;
import com.mems.client.FacilityClient;
import com.mems.client.PeopleClient;
import com.mems.client.RoomInfo;
import com.mems.client.StudentClass;
import com.mems.dto.RoomSuggestionResponse;
import com.mems.dto.ScheduleRequest;
import com.mems.dto.ScheduleResponse;
import com.mems.exception.AppException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@JdbcTest
class ScheduleServiceTest {
    private static final String ORG = "org-1";
    private static final String DEPT = "dept-1";
    private static final Instant START = Instant.parse("2026-11-20T08:00:00Z");
    private static final Instant END = Instant.parse("2026-11-20T09:30:00Z");

    @Autowired
    private JdbcTemplate jdbc;

    @MockBean
    private PeopleClient people;
    @MockBean
    private FacilityClient facility;

    private ScheduleService service;

    @BeforeEach
    void setUp() {
        service = new ScheduleService(jdbc, people, facility);
        jdbc.update("""
            INSERT INTO `class`(id,org_id,code,name,subject,max_size,start_date,end_date,status)
            VALUES ('class-1',?, 'C1','Lớp 1','Toán',30,'2026-01-01','2026-12-31','ongoing')
            """, ORG);
        when(people.classInfo(ORG, "class-1")).thenReturn(new ClassInfo("class-1", ORG,
            "C1", "Lớp 1", "DANG_DIEN_RA", "teacher-1", "GV 1",
            LocalDate.parse("2026-01-01"), LocalDate.parse("2026-12-31"), "Toán", 20));
        when(facility.room(anyString(), anyString())).thenReturn(
            new RoomInfo("room-1", "R1", "Phòng 1", 40, "active", DEPT, 0));
    }

    private ScheduleRequest request(String roomId, Instant start, Instant end) {
        return new ScheduleRequest("class-1", "teacher-1", roomId, start, end);
    }

    @Test
    @DisplayName("Tạo buổi học hợp lệ, lưu đúng org/phòng ban")
    void createSession() {
        ScheduleResponse created = service.create(ORG, DEPT, request("room-1", START, END));

        assertThat(created.classId()).isEqualTo("class-1");
        assertThat(created.departmentId()).isEqualTo(DEPT);
        assertThat(created.status()).isEqualTo("scheduled");
        assertThat(service.list(ORG, DEPT, null, null, null)).hasSize(1);
    }

    @Test
    @DisplayName("Tổ chức/phòng ban khác không thấy buổi học của nhau")
    void listIsScopedByOrganizationAndDepartment() {
        service.create(ORG, DEPT, request("room-1", START, END));

        assertThat(service.list("org-2", DEPT, null, null, null)).isEmpty();
        assertThat(service.list(ORG, "dept-2", null, null, null)).isEmpty();
    }

    @Test
    @DisplayName("Trùng giáo viên trong cùng khung giờ bị từ chối")
    void rejectsTeacherOverlap() {
        service.create(ORG, DEPT, request("room-1", START, END));

        assertThatThrownBy(() -> service.create(ORG, DEPT, request("room-1",
            START.plusSeconds(1800), END.plusSeconds(1800))))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode())
                .isEqualTo("TEACHER_SCHEDULE_CONFLICT"));
    }

    @Test
    @DisplayName("Trùng phòng trong cùng khung giờ bị từ chối")
    void rejectsRoomOverlap() {
        service.create(ORG, DEPT, request("room-1", START, END));
        when(people.classInfo(ORG, "class-1")).thenReturn(new ClassInfo("class-1", ORG,
            "C1", "Lớp 1", "DANG_DIEN_RA", "teacher-2", "GV 2",
            LocalDate.parse("2026-01-01"), LocalDate.parse("2026-12-31"), "Toán", 20));

        assertThatThrownBy(() -> service.create(ORG, DEPT,
            new ScheduleRequest("class-1", "teacher-2", "room-1", START, END)))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode())
                .isEqualTo("ROOM_SCHEDULE_CONFLICT"));
    }

    @Test
    @DisplayName("Lớp đã hủy không được xếp lịch")
    void rejectsCancelledClass() {
        when(people.classInfo(ORG, "class-1")).thenReturn(new ClassInfo("class-1", ORG,
            "C1", "Lớp 1", "DA_HUY", "teacher-1", "GV 1",
            LocalDate.parse("2026-01-01"), LocalDate.parse("2026-12-31"), "Toán", 20));

        assertThatThrownBy(() -> service.create(ORG, DEPT, request("room-1", START, END)))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode())
                .isEqualTo("CLASS_NOT_SCHEDULABLE"));
    }

    @Test
    @DisplayName("Giáo viên chỉ thấy buổi mình dạy")
    void teacherSeesOnlyOwnSessions() {
        service.create(ORG, DEPT, request("room-1", START, END));
        when(people.studentClasses(ORG, "teacher-1")).thenReturn(List.of());

        List<ScheduleResponse> mine = service.mine(ORG, "teacher-1", "TEACHER", null, null);
        List<ScheduleResponse> other = service.mine(ORG, "teacher-2", "TEACHER", null, null);

        assertThat(mine).hasSize(1);
        assertThat(other).isEmpty();
    }

    @Test
    @DisplayName("Học sinh thấy buổi của lớp mình")
    void studentSeesOwnClassSessions() {
        service.create(ORG, DEPT, request("room-1", START, END));
        when(people.studentClasses(ORG, "student-1"))
            .thenReturn(List.of(new StudentClass("class-1", "C1", "Lớp 1", "DANG_DIEN_RA")));

        assertThat(service.mine(ORG, "student-1", "STUDENT", null, null)).hasSize(1);
    }

    @Test
    @DisplayName("Gợi ý phòng loại phòng bảo trì, phòng có thiết bị hỏng và phòng đã kín lịch")
    void roomSuggestionsExcludeUnusableRooms() {
        service.create(ORG, DEPT, request("room-1", START, END));
        when(facility.rooms(ORG, DEPT)).thenReturn(List.of(
            new RoomInfo("room-1", "R1", "Đã dùng", 40, "active", DEPT, 0),
            new RoomInfo("room-2", "R2", "Còn trống", 40, "active", DEPT, 0),
            new RoomInfo("room-3", "R3", "Bảo trì", 40, "maintenance", DEPT, 0),
            new RoomInfo("room-4", "R4", "Có máy hỏng", 40, "active", DEPT, 2)));

        List<RoomSuggestionResponse> suggestions = service.roomSuggestions(ORG, DEPT, START, END);

        assertThat(suggestions).extracting(RoomSuggestionResponse::id).containsExactly("room-2");
    }

    @Test
    @DisplayName("Khung giờ không hợp lệ bị từ chối")
    void rejectsInvalidWindow() {
        assertThatThrownBy(() -> service.create(ORG, DEPT, request("room-1", END, START)))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("INVALID_TIME_RANGE"));
    }
}
