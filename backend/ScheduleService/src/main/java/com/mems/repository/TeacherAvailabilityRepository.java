package com.mems.repository;

import com.mems.schedule.TeacherAvailability;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Khoảng rảnh/bận theo tuần của giáo viên; mọi truy vấn đều lọc org_id. */
@Repository
public class TeacherAvailabilityRepository {
    private final JdbcTemplate jdbc;

    public TeacherAvailabilityRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<TeacherAvailability> listByTeacher(String orgId, String teacherId) {
        return jdbc.query("""
            SELECT weekday, from_period, to_period, kind
            FROM teacher_availability WHERE org_id=? AND teacher_id=?
            ORDER BY weekday, from_period, to_period
            """, (rs, rowNum) -> new TeacherAvailability(
                rs.getInt("weekday"),
                rs.getInt("from_period"),
                rs.getInt("to_period"),
                TeacherAvailability.Kind.valueOf(rs.getString("kind"))), orgId, teacherId);
    }

    /** Nạp lịch rảnh/bận của nhiều giáo viên trong một truy vấn. */
    public Map<String, List<TeacherAvailability>> listByTeachers(String orgId,
                                                                 Collection<String> teacherIds) {
        Map<String, List<TeacherAvailability>> result = new LinkedHashMap<>();
        if (teacherIds == null || teacherIds.isEmpty()) return result;
        List<String> ids = new ArrayList<>(teacherIds);
        String placeholders = String.join(",", ids.stream().map(id -> "?").toList());
        List<Object> args = new ArrayList<>();
        args.add(orgId);
        args.addAll(ids);
        jdbc.query("""
            SELECT teacher_id, weekday, from_period, to_period, kind
            FROM teacher_availability WHERE org_id=? AND teacher_id IN (""" + placeholders + """
            ) ORDER BY teacher_id, weekday, from_period, to_period
            """, rs -> {
                result.computeIfAbsent(rs.getString("teacher_id"), key -> new ArrayList<>())
                    .add(new TeacherAvailability(rs.getInt("weekday"), rs.getInt("from_period"),
                        rs.getInt("to_period"),
                        TeacherAvailability.Kind.valueOf(rs.getString("kind"))));
            }, args.toArray());
        return result;
    }

    public void deleteByTeacher(String orgId, String teacherId) {
        jdbc.update("DELETE FROM teacher_availability WHERE org_id=? AND teacher_id=?", orgId, teacherId);
    }

    public void insert(String orgId, String teacherId, TeacherAvailability entry, Instant now) {
        jdbc.update("""
            INSERT INTO teacher_availability(id, org_id, teacher_id, weekday, from_period,
                                             to_period, kind, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?)
            """, UUID.randomUUID().toString(), orgId, teacherId, entry.weekday(),
            entry.fromPeriod(), entry.toPeriod(), entry.kind().name(),
            Timestamp.from(now), Timestamp.from(now));
    }
}
