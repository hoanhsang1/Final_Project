package com.mems.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mems.dto.EventEnvelope;
import com.mems.exception.AppException;
import com.mems.inbox.InboxRepository;
import com.mems.inbox.ConsumerStateRepository;
import com.mems.inbox.SessionImpactRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@JdbcTest
class ScheduleEventConsumerTest {
    private static final String ORG = "org-1";
    private static final String CLASS = "class-1";
    private static final String ROOM = "room-1";

    @Autowired
    private JdbcTemplate jdbc;

    private final ObjectMapper mapper = new ObjectMapper();
    private ScheduleEventConsumer consumer;

    @BeforeEach
    void setUp() {
        SessionImpactRepository impacts = new SessionImpactRepository(jdbc);
        ScheduleEventApplier applier = new ScheduleEventApplier(impacts,
            new ConsumerStateRepository(jdbc), new InboxRepository(jdbc), mapper);
        consumer = new ScheduleEventConsumer(new InboxRepository(jdbc), applier);
    }

    @Test
    @DisplayName("SCH-01: đổi giáo viên đánh dấu buổi tương lai, KHÔNG tự đổi teacher_id")
    void teacherChangedMarksFutureSessionsOnly() {
        insertClass(CLASS, ORG);
        String future = insertSession("s-future", CLASS, "dept-1", "teacher-old", ROOM,
            Instant.now().plusSeconds(86_400), "scheduled");
        String past = insertSession("s-past", CLASS, "dept-1", "teacher-old", ROOM,
            Instant.now().minusSeconds(86_400), "scheduled");
        String cancelled = insertSession("s-cancelled", CLASS, "dept-1", "teacher-old", ROOM,
            Instant.now().plusSeconds(172_800), "cancelled");

        consumer.handle(teacherChangedEvent("evt-1", 2L, "teacher-old", "teacher-new"));

        assertThat(impactsOf(future)).hasSize(1);
        assertThat(statusOf(future)).isEqualTo("OPEN");
        assertThat(impactsOf(past)).isEmpty();
        assertThat(impactsOf(cancelled)).isEmpty();
        assertThat(teacherOf(future)).isEqualTo("teacher-old");
        assertThat(inboxStatus("evt-1")).isEqualTo("PROCESSED");
    }

    @Test
    @DisplayName("Idempotency: cùng eventId gửi lại không tạo impact lặp")
    void duplicateEventIsIgnored() {
        insertClass(CLASS, ORG);
        String session = insertSession("s-1", CLASS, "dept-1", "teacher-old", ROOM,
            Instant.now().plusSeconds(86_400), "scheduled");
        EventEnvelope event = teacherChangedEvent("evt-dup", 2L, "teacher-old", "teacher-new");

        consumer.handle(event);
        consumer.handle(event);

        assertThat(impactsOf(session)).hasSize(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM inbox_event WHERE event_id='evt-dup'",
            Integer.class)).isEqualTo(1);
    }

    @Test
    @DisplayName("Thứ tự: event version cũ hơn bị bỏ qua")
    void staleVersionIsIgnored() {
        insertClass(CLASS, ORG);
        String session = insertSession("s-1", CLASS, "dept-1", "t0", ROOM,
            Instant.now().plusSeconds(86_400), "scheduled");

        consumer.handle(teacherChangedEvent("evt-new", 5L, "t0", "t2"));
        consumer.handle(teacherChangedEvent("evt-old", 4L, "t0", "t1"));

        assertThat(impactsOf(session)).hasSize(1);
        assertThat(inboxStatus("evt-old")).isEqualTo("PROCESSED");
    }

    @Test
    @DisplayName("CLS-03: lớp bị hủy đánh dấu buổi; mở lại thì đóng impact (không xóa buổi)")
    void classCancelledMarksThenReopenResolves() {
        insertClass(CLASS, ORG);
        String session = insertSession("s-1", CLASS, "dept-1", "t1", ROOM,
            Instant.now().plusSeconds(86_400), "scheduled");

        consumer.handle(statusChangedEvent("evt-cancel", 2L, "DA_HUY", "NONE", "NONE"));
        assertThat(statusOf(session)).isEqualTo("OPEN");

        consumer.handle(statusChangedEvent("evt-reopen", 3L, "DANG_DIEN_RA", "NONE", "NONE"));
        assertThat(statusOf(session)).isEqualTo("RESOLVED");
        assertThat(jdbc.queryForObject("SELECT status FROM session WHERE id=?", String.class, session))
            .isEqualTo("scheduled");
    }

    @Test
    @DisplayName("CLS-03: hủy lớp nhiều môn đánh dấu mọi buổi tương lai, kể cả buổi môn khác")
    void cancelMultiSubjectClassMarksAllFutureSessions() {
        insertClass(CLASS, ORG);
        String math = insertSessionWithSubject("s-math", CLASS, "dept-1", "t1", ROOM, "sub-math",
            "Toán", Instant.now().plusSeconds(86_400), "scheduled");
        String physics = insertSessionWithSubject("s-physics", CLASS, "dept-1", "t2", ROOM,
            "sub-physics", "Lý", Instant.now().plusSeconds(172_800), "scheduled");
        String pastMath = insertSessionWithSubject("s-past-math", CLASS, "dept-1", "t1", ROOM,
            "sub-math", "Toán", Instant.now().minusSeconds(86_400), "scheduled");

        consumer.handle(statusChangedEvent("evt-cancel-multi", 2L, "DA_HUY", "NONE", "DA_HUY"));

        assertThat(impactsOf(math)).hasSize(1);
        assertThat(impactsOf(physics)).hasSize(1);
        assertThat(impactsOf(pastMath)).isEmpty();
        assertThat(statusOf(math)).isEqualTo("OPEN");
        assertThat(statusOf(physics)).isEqualTo("OPEN");
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM session_impact WHERE source_type='CLASS_STATUS_CHANGED'",
            Integer.class)).isEqualTo(2);
    }

    @Test
    @DisplayName("SCH-04: sự cố phòng đánh dấu buổi tương lai dùng phòng đó")
    void incidentOpenedMarksFutureSessionsOfRoom() {
        insertClass(CLASS, ORG);
        String sameRoom = insertSession("s-room", CLASS, "dept-1", "t1", ROOM,
            Instant.now().plusSeconds(86_400), "scheduled");
        String otherRoom = insertSession("s-other", CLASS, "dept-1", "t1", "room-2",
            Instant.now().plusSeconds(86_400), "scheduled");

        consumer.handle(incidentEvent("evt-open", "FacilityIncidentOpened", "inc-1", ROOM));

        assertThat(impactsOf(sameRoom)).hasSize(1);
        assertThat(impactsOf(otherRoom)).isEmpty();
        assertThat(jdbc.queryForObject("SELECT source_type FROM session_impact WHERE session_id=?",
            String.class, sameRoom)).isEqualTo("FACILITY_INCIDENT");
        assertThat(jdbc.queryForObject("SELECT status FROM session WHERE id=?", String.class, sameRoom))
            .isEqualTo("scheduled");
    }

    @Test
    @DisplayName("SCH-04: sự cố xong chỉ đóng impact khi buổi còn dùng đúng phòng")
    void incidentResolvedKeepsImpactWhenRoomWasChanged() {
        insertClass(CLASS, ORG);
        String stillInRoom = insertSession("s-still", CLASS, "dept-1", "t1", ROOM,
            Instant.now().plusSeconds(86_400), "scheduled");
        String moved = insertSession("s-moved", CLASS, "dept-1", "t1", ROOM,
            Instant.now().plusSeconds(86_400), "scheduled");
        consumer.handle(incidentEvent("evt-open", "FacilityIncidentOpened", "inc-1", ROOM));
        jdbc.update("UPDATE session SET room_id='room-9' WHERE id=?", moved);

        consumer.handle(incidentEvent("evt-resolve", "FacilityIncidentResolved", "inc-1", ROOM));

        assertThat(statusOf(stillInRoom)).isEqualTo("RESOLVED");
        assertThat(statusOf(moved)).isEqualTo("OPEN");
    }

    @Test
    @DisplayName("Envelope thiếu trường bắt buộc → 400 và inbox FAILED")
    void invalidEnvelopeRejected() {
        EventEnvelope missingId = new EventEnvelope(null, "ClassTeacherChanged", 1, ORG,
            "CLASS", CLASS, 1L, Instant.now().toString(), "c", mapper.createObjectNode());

        assertThatThrownBy(() -> consumer.handle(missingId))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getStatus().value()).isEqualTo(400));
    }

    @Test
    @DisplayName("organizationId trong payload khác envelope → 400")
    void payloadOrganizationMismatchRejected() {
        EventEnvelope event = new EventEnvelope("evt-x", "ClassTeacherChanged", 1, ORG,
            "CLASS", CLASS, 1L, Instant.now().toString(), "c",
            mapper.createObjectNode().put("organizationId", "org-2"));

        assertThatThrownBy(() -> consumer.handle(event))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getStatus().value()).isEqualTo(400));
    }

    @Test
    @DisplayName("eventType lạ → lỗi 400 và inbox FAILED để publisher dừng retry")
    void unsupportedEventTypeFailsPermanently() {
        EventEnvelope event = new EventEnvelope("evt-unknown", "SomethingElse", 1, ORG,
            "CLASS", CLASS, 1L, Instant.now().toString(), "c", mapper.createObjectNode());

        assertThatThrownBy(() -> consumer.handle(event))
            .isInstanceOf(IllegalArgumentException.class);
        assertThat(inboxStatus("evt-unknown")).isEqualTo("FAILED");
    }

    // ---------------------------------------------------------------- fixtures

    private EventEnvelope teacherChangedEvent(String eventId, Long version,
                                              String previousTeacher, String newTeacher) {
        return new EventEnvelope(eventId, "ClassTeacherChanged", 1, ORG, "CLASS", CLASS, version,
            Instant.now().toString(), "corr-1", payload(
            "classId", CLASS, "classCode", "C001",
            "previousTeacherId", previousTeacher, "newTeacherId", newTeacher));
    }

    private EventEnvelope statusChangedEvent(String eventId, Long version, String newStatus,
                                             String closeState, String cancelState) {
        return new EventEnvelope(eventId, "ClassStatusChanged", 1, ORG, "CLASS", CLASS, version,
            Instant.now().toString(), "corr-2", payload(
            "classId", CLASS, "newStatus", newStatus,
            "closeState", closeState, "cancelState", cancelState));
    }

    private EventEnvelope incidentEvent(String eventId, String type, String incidentId, String roomId) {
        return new EventEnvelope(eventId, type, 1, ORG, "FACILITY_INCIDENT", incidentId, null,
            Instant.now().toString(), "corr-3", payload(
            "incidentId", incidentId, "equipmentId", "eq-1",
            "roomId", roomId, "status", type.endsWith("Resolved") ? "resolved" : "open"));
    }

    private JsonNode payload(String... pairs) {
        var node = mapper.createObjectNode();
        for (int i = 0; i < pairs.length; i += 2) {
            node.put(pairs[i], pairs[i + 1]);
        }
        return node;
    }

    private void insertClass(String id, String orgId) {
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("""
            INSERT INTO `class`(id, org_id, code, name, status, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?)
            """, id, orgId, "C001", "Lớp 10A", "ongoing", now, now);
    }

    private String insertSession(String id, String classId, String departmentId, String teacherId,
                                 String roomId, Instant start, String status) {
        Timestamp at = Timestamp.from(start);
        jdbc.update("""
            INSERT INTO session(id, class_id, department_id, teacher_id, room_id, start_time,
                                end_time, status, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?)
            """, id, classId, departmentId, teacherId, roomId, at,
            Timestamp.from(start.plusSeconds(3_600)), status, at, at);
        return id;
    }

    private String insertSessionWithSubject(String id, String classId, String departmentId,
                                            String teacherId, String roomId, String subjectId,
                                            String subjectName, Instant start, String status) {
        Timestamp at = Timestamp.from(start);
        jdbc.update("""
            INSERT INTO session(id, class_id, department_id, teacher_id, room_id, subject_id,
                                subject_name, start_time, end_time, status, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            """, id, classId, departmentId, teacherId, roomId, subjectId, subjectName, at,
            Timestamp.from(start.plusSeconds(3_600)), status, at, at);
        return id;
    }

    private List<String> impactsOf(String sessionId) {
        return jdbc.queryForList("SELECT id FROM session_impact WHERE session_id=?",
            String.class, sessionId);
    }

    private String statusOf(String sessionId) {
        return jdbc.queryForObject("SELECT status FROM session_impact WHERE session_id=?",
            String.class, sessionId);
    }

    private String teacherOf(String sessionId) {
        return jdbc.queryForObject("SELECT teacher_id FROM session WHERE id=?",
            String.class, sessionId);
    }

    private String inboxStatus(String eventId) {
        return jdbc.queryForObject("SELECT status FROM inbox_event WHERE event_id=?",
            String.class, eventId);
    }
}
