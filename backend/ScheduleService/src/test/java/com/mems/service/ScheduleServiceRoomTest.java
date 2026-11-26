package com.mems.service;

import com.mems.client.ClassInfo;
import com.mems.client.FacilityClient;
import com.mems.client.PeopleClient;
import com.mems.client.RoomInfo;
import com.mems.dto.RoomSuggestionResponse;
import com.mems.exception.AppException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Loại phòng + sức chứa trong gợi ý phòng và kiểm tra phòng khi tạo/sửa buổi. */
@JdbcTest
class ScheduleServiceRoomTest {
    private static final String ORG = "org-room";
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
    }

    private void givenClass(String classId, int studentCount) {
        jdbc.update("""
            INSERT INTO `class`(id,org_id,code,name,subject,max_size,start_date,end_date,status)
            VALUES (?,?,?,?,?,?,?,?,?)
            """, classId, ORG, "C-" + classId, "Lớp " + classId, "Toán", studentCount,
            LocalDate.parse("2026-01-01"), LocalDate.parse("2026-12-31"), "ongoing");
        when(people.classInfo(ORG, classId)).thenReturn(new ClassInfo(classId, ORG,
            "C-" + classId, "Lớp " + classId, "DANG_DIEN_RA", "NONE", "teacher-1", "GV 1",
            LocalDate.parse("2026-01-01"), LocalDate.parse("2026-12-31"), "subj-1", "Toán",
            studentCount));
    }

    private void givenSessionInRoom(String classId, String departmentId, String roomId) {
        jdbc.update("""
            INSERT INTO session(id,class_id,department_id,room_id,start_time,end_time,status)
            VALUES (?,?,?,?,?,?,?)
            """, "sess-" + roomId, classId, departmentId, roomId,
            Timestamp.from(START), Timestamp.from(END), "scheduled");
    }

    @Test
    @DisplayName("ROOM-01: có classId thì chỉ gợi ý phòng đủ sức chứa")
    void suggestionsFilterByCapacity() {
        givenClass("class-35", 35);
        when(facility.roomsOfOrg(ORG)).thenReturn(List.of(
            new RoomInfo("r-30", "R30", "Phòng 30", 30, "active", DEPT, 0, "classroom"),
            new RoomInfo("r-25", "R25", "Máy 25", 25, "active", DEPT, 0, "computer_room"),
            new RoomInfo("r-40", "R40", "Phòng 40", 40, "active", DEPT, 0, "classroom")));

        List<RoomSuggestionResponse> result =
            service.roomSuggestions(ORG, DEPT, "class-35", START, END);

        assertThat(result).extracting(RoomSuggestionResponse::id).containsExactly("r-40");
    }

    @Test
    @DisplayName("ROOM-02: phòng thường xếp trước phòng máy, cùng loại giữ thứ tự theo tên")
    void suggestionsPutNormalRoomsFirst() {
        givenClass("class-20", 20);
        when(facility.roomsOfOrg(ORG)).thenReturn(List.of(
            new RoomInfo("r-a", "RA", "Máy A", 40, "active", DEPT, 0, "computer_room"),
            new RoomInfo("r-b", "RB", "Phòng B", 40, "active", DEPT, 0, "classroom"),
            new RoomInfo("r-c", "RC", "Máy C", 60, "active", DEPT, 0, "computer_room"),
            new RoomInfo("r-d", "RD", "Phòng D", 50, "active", DEPT, 0, "classroom")));

        List<RoomSuggestionResponse> result =
            service.roomSuggestions(ORG, DEPT, "class-20", START, END);

        assertThat(result).extracting(RoomSuggestionResponse::id)
            .containsExactly("r-b", "r-d", "r-a", "r-c");
        assertThat(result).extracting(RoomSuggestionResponse::roomType)
            .containsExactly("classroom", "classroom", "computer_room", "computer_room");
    }

    @Test
    @DisplayName("ROOM-03: phòng đã bị phòng ban khác đặt vẫn bị loại khỏi gợi ý")
    void suggestionsExcludeRoomBookedByAnotherDepartment() {
        givenClass("class-20", 20);
        givenClass("class-other", 20);
        givenSessionInRoom("class-other", "dept-2", "r-b");
        when(facility.roomsOfOrg(ORG)).thenReturn(List.of(
            new RoomInfo("r-b", "RB", "Phòng B", 40, "active", "dept-2", 0, "classroom"),
            new RoomInfo("r-d", "RD", "Phòng D", 50, "active", DEPT, 0, "classroom")));

        List<RoomSuggestionResponse> result =
            service.roomSuggestions(ORG, DEPT, "class-20", START, END);

        assertThat(result).extracting(RoomSuggestionResponse::id).containsExactly("r-d");
    }

    @Test
    @DisplayName("ROOM-04: gợi ý lấy phòng cấp tổ chức, không gọi theo phòng ban")
    void suggestionsUseOrgWideRooms() {
        givenClass("class-20", 20);
        when(facility.roomsOfOrg(ORG)).thenReturn(List.of());

        service.roomSuggestions(ORG, DEPT, "class-20", START, END);

        verify(facility).roomsOfOrg(ORG);
        verify(facility, never()).rooms(any(), any());
    }

    @Test
    @DisplayName("ROOM-05: môn cần phòng máy nhưng chọn phòng thường bị từ chối")
    void validateRoomRejectsClassroomForComputerRequirement() {
        ClassInfo info = classInfo(35);
        when(facility.room(ORG, "r-30")).thenReturn(
            new RoomInfo("r-30", "R30", "Phòng 30", 40, "active", DEPT, 0, "classroom"));

        assertThatThrownBy(() -> service.validateRoom(ORG, info, "r-30", "COMPUTER"))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode())
                .isEqualTo("ROOM_TYPE_MISMATCH"));
    }

    @Test
    @DisplayName("ROOM-06: môn cần phòng máy chọn đúng phòng máy thì hợp lệ")
    void validateRoomAllowsComputerRoomForComputerRequirement() {
        ClassInfo info = classInfo(35);
        when(facility.room(ORG, "r-lab")).thenReturn(
            new RoomInfo("r-lab", "LAB1", "Phòng máy 1", 40, "active", DEPT, 0, "computer_room"));

        assertThatCode(() -> service.validateRoom(ORG, info, "r-lab", "COMPUTER"))
            .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("ROOM-07: môn ANY được xếp vào cả phòng thường lẫn phòng máy")
    void validateRoomAllowsAnyRoomWhenNoRequirement() {
        ClassInfo info = classInfo(35);
        when(facility.room(ORG, "r-30")).thenReturn(
            new RoomInfo("r-30", "R30", "Phòng 30", 40, "active", DEPT, 0, "classroom"));
        when(facility.room(ORG, "r-lab")).thenReturn(
            new RoomInfo("r-lab", "LAB1", "Phòng máy 1", 40, "active", DEPT, 0, "computer_room"));

        assertThatCode(() -> service.validateRoom(ORG, info, "r-30", "ANY"))
            .doesNotThrowAnyException();
        assertThatCode(() -> service.validateRoom(ORG, info, "r-lab", "ANY"))
            .doesNotThrowAnyException();
        assertThatCode(() -> service.validateRoom(ORG, info, "r-lab", null))
            .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("ROOM-08: phòng nhỏ hơn sĩ số vẫn bị từ chối")
    void validateRoomRejectsTooSmallRoom() {
        ClassInfo info = classInfo(35);
        when(facility.room(ORG, "r-25")).thenReturn(
            new RoomInfo("r-25", "R25", "Phòng 25", 25, "active", DEPT, 0, "classroom"));

        assertThatThrownBy(() -> service.validateRoom(ORG, info, "r-25", "ANY"))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode())
                .isEqualTo("ROOM_NOT_AVAILABLE"));
    }

    private ClassInfo classInfo(int studentCount) {
        return new ClassInfo("class-" + studentCount, ORG, "C1", "Lớp " + studentCount,
            "DANG_DIEN_RA", "NONE", "teacher-1", "GV 1", LocalDate.parse("2026-01-01"),
            LocalDate.parse("2026-12-31"), "subj-1", "Toán", studentCount);
    }
}
