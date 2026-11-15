package com.mems.service;

import com.mems.dto.EquipmentRequest;
import com.mems.dto.EquipmentResponse;
import com.mems.dto.IssueReportRequest;
import com.mems.dto.IssueResponse;
import com.mems.dto.RoomRequest;
import com.mems.dto.RoomResponse;
import com.mems.exception.AppException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@JdbcTest
class FacilityServiceTest {
    @Autowired
    private JdbcTemplate jdbc;

    private FacilityService service;

    @BeforeEach
    void setUp() {
        service = new FacilityService(jdbc);
    }

    private RoomResponse room(String code) {
        return service.createRoom("org-1", "dept-1",
            new RoomRequest(code, "Phòng " + code, "A", "1", 40, "classroom", "active"));
    }

    @Test
    @DisplayName("Tạo phòng và chỉ thấy phòng của đúng org + phòng ban")
    void roomsAreScopedByOrganizationAndDepartment() {
        RoomResponse created = room("R1");
        service.createRoom("org-2", "dept-1",
            new RoomRequest("R2", "Phòng org khác", null, null, 30, "classroom", null));

        assertThat(service.listRooms("org-1", "dept-1"))
            .extracting(RoomResponse::code).containsExactly("R1");
        assertThat(created.status()).isEqualTo("active");
    }

    @Test
    @DisplayName("Xoá phòng còn thiết bị → ROOM_IN_USE")
    void deleteRoomRejectsActiveEquipment() {
        RoomResponse created = room("R1");
        service.createEquipment("org-1", "dept-1",
            new EquipmentRequest("EQ-1", "Máy chiếu", "projector", created.id(), "in_use", null));

        assertThatThrownBy(() -> service.deleteRoom("org-1", "dept-1", created.id()))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("ROOM_IN_USE"));
    }

    @Test
    @DisplayName("Báo sự cố đánh dấu thiết bị hỏng; xử lý đưa về in_use")
    void reportAndResolveIssueUpdatesEquipmentStatus() {
        RoomResponse created = room("R1");
        EquipmentResponse equipment = service.createEquipment("org-1", "dept-1",
            new EquipmentRequest("EQ-1", "Máy chiếu", "projector", created.id(), "in_use", null));

        IssueResponse issue = service.reportIssue("org-1", "dept-1", "user-1",
            new IssueReportRequest(equipment.id(), "Không lên nguồn", null));
        assertThat(issue.status()).isEqualTo("open");
        assertThat(jdbc.queryForObject("SELECT status FROM equipment WHERE id=?",
            String.class, equipment.id())).isEqualTo("broken");
        assertThat(service.internalRoom("org-1", created.id()).brokenEquipmentCount()).isEqualTo(1);

        IssueResponse resolved = service.resolveIssue("org-1", "dept-1", "user-1", issue.id());
        assertThat(resolved.status()).isEqualTo("resolved");
        assertThat(jdbc.queryForObject("SELECT status FROM equipment WHERE id=?",
            String.class, equipment.id())).isEqualTo("in_use");
    }

    @Test
    @DisplayName("Không xử lý được sự cố của tổ chức khác")
    void cannotSeeIssuesFromAnotherOrganization() {
        RoomResponse created = room("R1");
        EquipmentResponse equipment = service.createEquipment("org-1", "dept-1",
            new EquipmentRequest("EQ-1", "Máy chiếu", "projector", created.id(), "in_use", null));
        IssueResponse issue = service.reportIssue("org-1", "dept-1", "user-1",
            new IssueReportRequest(equipment.id(), "Hỏng", null));

        assertThatThrownBy(() -> service.resolveIssue("org-2", "dept-1", "user-2", issue.id()))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("ISSUE_NOT_FOUND"));
    }

    @Test
    @DisplayName("Sự cố đã xử lý không xử lý lại được")
    void resolveIsIdempotencyGuarded() {
        RoomResponse created = room("R1");
        EquipmentResponse equipment = service.createEquipment("org-1", "dept-1",
            new EquipmentRequest("EQ-1", "Máy chiếu", "projector", created.id(), "in_use", null));
        IssueResponse issue = service.reportIssue("org-1", "dept-1", "user-1",
            new IssueReportRequest(equipment.id(), "Hỏng", null));
        service.resolveIssue("org-1", "dept-1", "user-1", issue.id());

        assertThatThrownBy(() -> service.resolveIssue("org-1", "dept-1", "user-1", issue.id()))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("ISSUE_ALREADY_RESOLVED"));
    }
}
