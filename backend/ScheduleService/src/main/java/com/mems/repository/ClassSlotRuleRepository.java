package com.mems.repository;

import com.mems.schedule.ClassSlotRule;
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

/** Quy tắc tiết theo lớp; mọi truy vấn đều lọc org_id. */
@Repository
public class ClassSlotRuleRepository {
    private final JdbcTemplate jdbc;

    public ClassSlotRuleRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<ClassSlotRule> listByClass(String orgId, String classId) {
        return jdbc.query("""
            SELECT weekday, from_period, to_period, is_off
            FROM class_slot_rule WHERE org_id=? AND class_id=?
            ORDER BY weekday, from_period, to_period
            """, (rs, rowNum) -> new ClassSlotRule(
                rs.getInt("weekday"),
                rs.getInt("from_period"),
                rs.getInt("to_period"),
                rs.getBoolean("is_off")), orgId, classId);
    }

    /** Nạp quy tắc của nhiều lớp trong một truy vấn; lớp không có quy tắc không có key. */
    public Map<String, List<ClassSlotRule>> listByClasses(String orgId, Collection<String> classIds) {
        Map<String, List<ClassSlotRule>> result = new LinkedHashMap<>();
        if (classIds == null || classIds.isEmpty()) return result;
        List<String> ids = new ArrayList<>(classIds);
        String placeholders = String.join(",", ids.stream().map(id -> "?").toList());
        List<Object> args = new ArrayList<>();
        args.add(orgId);
        args.addAll(ids);
        jdbc.query("""
            SELECT class_id, weekday, from_period, to_period, is_off
            FROM class_slot_rule WHERE org_id=? AND class_id IN (""" + placeholders + """
            ) ORDER BY class_id, weekday, from_period, to_period
            """, rs -> {
                result.computeIfAbsent(rs.getString("class_id"), key -> new ArrayList<>())
                    .add(new ClassSlotRule(rs.getInt("weekday"), rs.getInt("from_period"),
                        rs.getInt("to_period"), rs.getBoolean("is_off")));
            }, args.toArray());
        return result;
    }

    public void deleteByClass(String orgId, String classId) {
        jdbc.update("DELETE FROM class_slot_rule WHERE org_id=? AND class_id=?", orgId, classId);
    }

    public void insert(String orgId, String classId, ClassSlotRule rule, Instant now) {
        jdbc.update("""
            INSERT INTO class_slot_rule(id, org_id, class_id, weekday, from_period, to_period,
                                        is_off, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?)
            """, UUID.randomUUID().toString(), orgId, classId, rule.weekday(),
            rule.fromPeriod(), rule.toPeriod(), rule.off(),
            Timestamp.from(now), Timestamp.from(now));
    }
}
