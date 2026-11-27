package com.mems.controller;

import com.mems.dto.InternalRoomResponse;
import com.mems.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Danh sách phòng học cho ScheduleService. Phòng là tài nguyên cấp tổ chức
 * (D7): không truyền departmentId sẽ lấy mọi phòng của org.
 */
@RestController
@RequestMapping("/internal/rooms")
public class InternalRoomController {
    private static final String ROOM_SELECT = """
        SELECT c.id, c.code, c.name, c.capacity, c.status, c.department_id, c.room_type,
               (SELECT COUNT(*) FROM equipment e
                 WHERE e.room_id = c.id
                   AND e.status IN ('broken','maintenance')
                   AND e.deleted_at IS NULL) AS broken_equipment_count
        FROM classroom c
        WHERE c.deleted_at IS NULL
        """;

    private final JdbcTemplate jdbc;

    public InternalRoomController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<InternalRoomResponse> list(@RequestParam String orgId,
                                           @RequestParam(required = false) String departmentId) {
        String sql = ROOM_SELECT + " AND c.org_id=?";
        Object[] args;
        if (departmentId == null) {
            args = new Object[]{orgId};
        } else {
            sql += " AND c.department_id=?";
            args = new Object[]{orgId, departmentId};
        }
        sql += " ORDER BY c.room_type, c.name, c.code";
        return jdbc.query(sql, (rs, n) -> mapRoom(rs), args);
    }

    @GetMapping("/{roomId}")
    public InternalRoomResponse room(@RequestParam String orgId, @PathVariable String roomId) {
        List<InternalRoomResponse> rows = jdbc.query(
            ROOM_SELECT + " AND c.org_id=? AND c.id=?",
            (rs, n) -> mapRoom(rs), orgId, roomId);
        if (rows.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Room not found");
        }
        return rows.get(0);
    }

    private InternalRoomResponse mapRoom(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new InternalRoomResponse(
            rs.getString("id"), rs.getString("code"), rs.getString("name"),
            rs.getInt("capacity"), rs.getString("status"), rs.getString("department_id"),
            rs.getInt("broken_equipment_count"), rs.getString("room_type"));
    }
}
