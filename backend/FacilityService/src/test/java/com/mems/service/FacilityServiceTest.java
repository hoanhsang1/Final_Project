package com.mems.service;

import com.mems.dto.EquipmentRequest;
import com.mems.dto.EquipmentResponse;
import com.mems.dto.IssueReportRequest;
import com.mems.dto.IssueResponse;
import com.mems.dto.RoomRequest;
import com.mems.dto.RoomResponse;
import com.mems.exception.AppException;
import com.mems.outbox.OutboxEventRepository;
import com.mems.outbox.OutboxEventTypes;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

@JdbcTest
class FacilityServiceTest {
    @Autowired
    private JdbcTemplate jdbc;

    private FacilityService service;
    private OutboxEventRepository outbox;

    @BeforeEach
    void setUp() {
        outbox = mock(OutboxEventRepository.class);
        service = new FacilityService(jdbc, outbox);
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
    @DisplayName("FAC-01: xử lý sự cố khôi phục đúng trạng thái trước khi báo hỏng")
    void resolveRestoresPreviousEquipmentStatus() {
        RoomResponse created = room("R1");
        EquipmentResponse equipment = service.createEquipment("org-1", "dept-1",
            new EquipmentRequest("EQ-1", "Máy chiếu", "projector", created.id(), "in_storage", null));
        IssueResponse issue = service.reportIssue("org-1", "dept-1", "user-1",
            new IssueReportRequest(equipment.id(), "Hỏng", null));

        service.resolveIssue("org-1", "dept-1", "user-1", issue.id());

        assertThat(jdbc.queryForObject("SELECT status FROM equipment WHERE id=?",
            String.class, equipment.id())).isEqualTo("in_storage");
    }

    @Test
    @DisplayName("FAC-01: còn sự cố khác đang mở thì thiết bị vẫn broken")
    void equipmentStaysBrokenWhileOtherIssuesOpen() {
        RoomResponse created = room("R1");
        EquipmentResponse equipment = service.createEquipment("org-1", "dept-1",
            new EquipmentRequest("EQ-1", "Máy chiếu", "projector", created.id(), "in_use", null));
        IssueResponse first = service.reportIssue("org-1", "dept-1", "user-1",
            new IssueReportRequest(equipment.id(), "Hỏng 1", null));
        service.reportIssue("org-1", "dept-1", "user-1",
            new IssueReportRequest(equipment.id(), "Hỏng 2", null));

        service.resolveIssue("org-1", "dept-1", "user-1", first.id());

        assertThat(jdbc.queryForObject("SELECT status FROM equipment WHERE id=?",
            String.class, equipment.id())).isEqualTo("broken");
    }

    @Test
    @DisplayName("SCH-04: báo sự cố phát FacilityIncidentOpened, không lộ mô tả/ảnh/người báo")
    void reportIssuePublishesOpenedEvent() {
        RoomResponse created = room("R1");
        EquipmentResponse equipment = service.createEquipment("org-1", "dept-1",
            new EquipmentRequest("EQ-1", "Máy chiếu", "projector", created.id(), "in_use", null));

        IssueResponse issue = service.reportIssue("org-1", "dept-1", "user-1",
            new IssueReportRequest(equipment.id(), "Không lên nguồn", "https://cdn/x.png"));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> payload = ArgumentCaptor.forClass(Map.class);
        verify(outbox).append(eq("org-1"), eq("FACILITY_INCIDENT"), eq(issue.id()), isNull(),
            eq(OutboxEventTypes.FACILITY_INCIDENT_OPENED), eq(1), anyString(), payload.capture());
        assertThat(payload.getValue())
            .containsEntry("incidentId", issue.id())
            .containsEntry("equipmentId", equipment.id())
            .containsEntry("equipmentName", "Máy chiếu")
            .containsEntry("roomId", created.id())
            .containsEntry("status", "open")
            .doesNotContainKeys("description", "photoUrl", "reportedBy");
    }

    @Test
    @DisplayName("SCH-04: xử lý sự cố phát FacilityIncidentResolved kèm phòng")
    void resolveIssuePublishesResolvedEvent() {
        RoomResponse created = room("R1");
        EquipmentResponse equipment = service.createEquipment("org-1", "dept-1",
            new EquipmentRequest("EQ-1", "Máy chiếu", "projector", created.id(), "in_use", null));
        IssueResponse issue = service.reportIssue("org-1", "dept-1", "user-1",
            new IssueReportRequest(equipment.id(), "Hỏng", null));

        service.resolveIssue("org-1", "dept-1", "user-1", issue.id());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> payload = ArgumentCaptor.forClass(Map.class);
        verify(outbox).append(eq("org-1"), eq("FACILITY_INCIDENT"), eq(issue.id()), isNull(),
            eq(OutboxEventTypes.FACILITY_INCIDENT_RESOLVED), eq(1), anyString(), payload.capture());
        assertThat(payload.getValue())
            .containsEntry("incidentId", issue.id())
            .containsEntry("roomId", created.id())
            .containsEntry("status", "resolved")
            .containsKey("resolvedAt");
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
