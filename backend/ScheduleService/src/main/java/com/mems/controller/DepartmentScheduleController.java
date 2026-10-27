package com.mems.controller;
import com.mems.security.Actor;
import com.mems.dto.ScheduleResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/departments/{departmentId}/schedules")
public class DepartmentScheduleController {
    private final JdbcTemplate jdbc;
    private final Actor actor;
    public DepartmentScheduleController(JdbcTemplate jdbc,Actor actor) { this.jdbc=jdbc;this.actor=actor; }
    @GetMapping @PreAuthorize("hasRole('OWNER') or hasAuthority('SCHEDULE_VIEW')")
    public List<ScheduleResponse> list(@PathVariable String departmentId) {
        actor.requireDepartment(departmentId);
        return jdbc.query("""
            SELECT s.id,s.class_id,s.teacher_id,s.room_id,s.start_time,s.end_time,s.status
            FROM session s JOIN `class` c ON c.id=s.class_id
            WHERE c.org_id=? AND s.department_id=? AND s.deleted_at IS NULL AND c.deleted_at IS NULL
            ORDER BY s.start_time
            """,(rs,n) -> new ScheduleResponse(rs.getString("id"),rs.getString("class_id"),rs.getString("teacher_id"),
                rs.getString("room_id"),rs.getTimestamp("start_time").toInstant(),rs.getTimestamp("end_time").toInstant(),
                rs.getString("status")),actor.orgId(),departmentId);
    }
}
