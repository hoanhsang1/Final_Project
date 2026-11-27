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

/**
 * Lịch cá nhân (`GET /schedules/me`, qua gateway là `/api/schedules/me`).
 *
 * <p>Actor lấy từ JWT — client KHÔNG gửi {@code departmentId} hay {@code classId}.
 * Giáo viên thấy các buổi mình dạy ({@code session.teacher_id}); học sinh thấy các buổi
 * của lớp đã ghi danh ({@code class_enrollment}). Hai nguồn được gộp bằng OR nên cùng
 * một API phục vụ cả hai vai trò.</p>
 */
@RestController
@RequestMapping("/schedules")
public class SelfScheduleController {
    private final JdbcTemplate jdbc;
    private final Actor actor;
    private final SchoolClock clock;

    public SelfScheduleController(JdbcTemplate jdbc, Actor actor, SchoolClock clock) {
        this.jdbc = jdbc; this.actor = actor; this.clock = clock;
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('OWNER') or hasAnyAuthority('SCHEDULE_SELF_VIEW','schedule.self_view','SCHEDULE_VIEW','schedule.view')")
    public List<ScheduleResponse> me(@RequestParam(required = false) String from,
                                     @RequestParam(required = false) String to) {
        LocalDate fromDate = parseDate(from, "from");
        LocalDate toDate = parseDate(to, "to");
        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Khoảng ngày không hợp lệ");
        }
        String userId = actor.userId();
        StringBuilder sql = new StringBuilder("""
            SELECT s.id, s.class_id, COALESCE(NULLIF(c.code,''), c.name) AS class_name,
                   s.teacher_id, s.teacher_name, s.room_id, s.room_code,
                   COALESCE(s.subject_name, c.subject) AS subject_name,
                   s.start_time, s.end_time, s.status
            FROM session s JOIN `class` c ON c.id=s.class_id
            WHERE c.org_id=? AND s.deleted_at IS NULL AND c.deleted_at IS NULL
              AND (s.teacher_id=? OR EXISTS (
                    SELECT 1 FROM class_enrollment ce
                    WHERE ce.class_id=s.class_id AND ce.student_id=? AND ce.status='active'))
            """);
        List<Object> args = new ArrayList<>();
        args.add(actor.orgId());
        args.add(userId);
        args.add(userId);
        if (fromDate != null) {
            sql.append(" AND s.start_time >= ?");
            args.add(Timestamp.from(clock.toInstant(fromDate, LocalTime.MIDNIGHT)));
        }
        if (toDate != null) {
            sql.append(" AND s.start_time < ?");
            args.add(Timestamp.from(clock.toInstant(toDate.plusDays(1), LocalTime.MIDNIGHT)));
        }
        sql.append(" ORDER BY s.start_time");
        return jdbc.query(sql.toString(), (rs, n) -> new ScheduleResponse(
            rs.getString("id"), rs.getString("class_id"), rs.getString("class_name"),
            rs.getString("teacher_id"), rs.getString("teacher_name"),
            rs.getString("room_id"), rs.getString("room_code"), rs.getString("subject_name"),
            rs.getTimestamp("start_time").toInstant(), rs.getTimestamp("end_time").toInstant(),
            rs.getString("status")), args.toArray());
    }

    /** FE gửi ISO instant theo giờ VN; API khác có thể gửi {@code YYYY-MM-DD}. */
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
