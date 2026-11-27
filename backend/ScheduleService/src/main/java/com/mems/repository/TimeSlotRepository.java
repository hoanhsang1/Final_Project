package com.mems.repository;

import com.mems.schedule.TimeSlot;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Bảng tiết học theo tổ chức; mọi truy vấn đều lọc org_id. */
@Repository
public class TimeSlotRepository {
    private final JdbcTemplate jdbc;

    public TimeSlotRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<TimeSlot> listByOrg(String orgId) {
        return jdbc.query("""
            SELECT id, period_no, name, start_time, end_time, joins_next, is_active
            FROM time_slot WHERE org_id=? ORDER BY period_no
            """, (rs, rowNum) -> new TimeSlot(
                rs.getString("id"),
                rs.getInt("period_no"),
                rs.getString("name"),
                rs.getTime("start_time").toLocalTime(),
                rs.getTime("end_time").toLocalTime(),
                rs.getBoolean("joins_next"),
                rs.getBoolean("is_active")), orgId);
    }

    public void deleteByOrg(String orgId) {
        jdbc.update("DELETE FROM time_slot WHERE org_id=?", orgId);
    }

    public void insert(String orgId, TimeSlot slot, Instant now) {
        jdbc.update("""
            INSERT INTO time_slot(id, org_id, period_no, name, start_time, end_time,
                                  joins_next, is_active, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?)
            """, UUID.randomUUID().toString(), orgId, slot.periodNo(), slot.name(),
            java.sql.Time.valueOf(slot.start()), java.sql.Time.valueOf(slot.end()),
            slot.joinsNext(), slot.active(), Timestamp.from(now), Timestamp.from(now));
    }
}
