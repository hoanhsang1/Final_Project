package com.mems.controller;
import com.mems.dto.ScheduleResponse;
import com.mems.exception.ApiException;
import com.mems.security.Actor;
import com.mems.time.SchoolClock;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/departments/{departmentId}/schedules")
public class DepartmentScheduleController {
    private final JdbcTemplate jdbc;
    private final Actor actor;
    private final SchoolClock clock;
    public DepartmentScheduleController(JdbcTemplate jdbc, Actor actor, SchoolClock clock) {
        this.jdbc = jdbc; this.actor = actor; this.clock = clock;
    }
    @GetMapping @PreAuthorize("hasRole('OWNER') or hasAuthority('SCHEDULE_VIEW')")
    public List<ScheduleResponse> list(@PathVariable String departmentId,
                                       @RequestParam(required = false) String from,
                                       @RequestParam(required = false) String to,
                                       @RequestParam(required = false) String classId) {
        actor.requireDepartment(departmentId);
        LocalDate fromDate = parseDate(from, "from");
        LocalDate toDate = parseDate(to, "to");
        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Khoảng ngày không hợp lệ");
        }
        StringBuilder sql = new StringBuilder("""
            SELECT s.id, s.class_id, COALESCE(NULLIF(c.code,''), c.name) AS class_name,
                   s.teacher_id, s.teacher_name, s.room_id, s.room_code,
                   COALESCE(s.subject_name, c.subject) AS subject_name,
                   s.start_time, s.end_time, s.status
            FROM session s JOIN `class` c ON c.id=s.class_id
            WHERE c.org_id=? AND s.department_id=? AND s.deleted_at IS NULL AND c.deleted_at IS NULL
            """);
        List<Object> args = new ArrayList<>();
        args.add(actor.orgId());
        args.add(departmentId);
        // FE gửi ngày-local; DB lưu Instant theo múi giờ nghiệp vụ (SchoolClock).
        if (fromDate != null) {
            sql.append(" AND s.start_time >= ?");
            args.add(Timestamp.from(clock.toInstant(fromDate, LocalTime.MIDNIGHT)));
        }
        if (toDate != null) {
            sql.append(" AND s.start_time < ?");
            args.add(Timestamp.from(clock.toInstant(toDate.plusDays(1), LocalTime.MIDNIGHT)));
        }
        if (classId != null && !classId.isBlank()) {
            sql.append(" AND s.class_id = ?");
            args.add(classId.trim());
        }
        sql.append(" ORDER BY s.start_time");
        return jdbc.query(sql.toString(), (rs, n) -> new ScheduleResponse(
            rs.getString("id"), rs.getString("class_id"), rs.getString("class_name"),
            rs.getString("teacher_id"), rs.getString("teacher_name"),
            rs.getString("room_id"), rs.getString("room_code"), rs.getString("subject_name"),
            rs.getTimestamp("start_time").toInstant(), rs.getTimestamp("end_time").toInstant(),
            rs.getString("status")), args.toArray());
    }

    /** FE DateInput gửi ISO instant theo giờ VN; API khác có thể gửi {@code YYYY-MM-DD}. */
    private LocalDate parseDate(String value, String param) {
        if (value == null || value.isBlank()) return null;
        try {
            return clock.toLocalDate(Instant.parse(value));
        } catch (DateTimeParseException ignored) {
            // Thử tiếp các định dạng khác.
        }
        try {
            return clock.toLocalDate(OffsetDateTime.parse(value).toInstant());
        } catch (DateTimeParseException ignored) {
            // Thử tiếp định dạng ngày thuần.
        }
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException ignored) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
                "Tham số " + param + " không hợp lệ");
        }
    }
}
