package com.mems.repository;

import com.mems.service.TextNormalizer;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Repository
public class StaffProfileRepository {
    private final JdbcTemplate jdbc;

    public StaffProfileRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record StaffProfile(
        String userId, String orgId, String staffCode, String fullName, String email, String phone,
        String departmentId, String role, long version, Instant createdAt, Instant updatedAt
    ) {}

    public Optional<StaffProfile> find(String userId, String orgId) {
        List<StaffProfile> rows = jdbc.query("""
            SELECT sp.user_id, sp.org_id, sp.staff_code, sp.full_name, sp.email, sp.phone,
                   dm.department_id, dm.role, sp.version, sp.created_at, sp.updated_at
            FROM staff_profile sp
            JOIN department_member dm ON dm.user_id=sp.user_id AND dm.org_id=sp.org_id
            WHERE sp.user_id=? AND sp.org_id=?
            """, (rs, n) -> new StaffProfile(
                rs.getString("user_id"), rs.getString("org_id"), rs.getString("staff_code"),
                rs.getString("full_name"), rs.getString("email"), rs.getString("phone"),
                rs.getString("department_id"), rs.getString("role"), rs.getLong("version"),
                rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toInstant() : null,
                rs.getTimestamp("updated_at") != null ? rs.getTimestamp("updated_at").toInstant() : null
            ), userId, orgId);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    public boolean existsCode(String orgId, String staffCode) {
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM staff_profile WHERE org_id=? AND staff_code=?",
            Integer.class, orgId, staffCode);
        return count != null && count > 0;
    }

    public boolean existsEmail(String orgId, String email, String excludeUserId) {
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM staff_profile WHERE org_id=? AND LOWER(email)=? AND user_id<>?",
            Integer.class, orgId, email.toLowerCase(Locale.ROOT), excludeUserId);
        return count != null && count > 0;
    }

    public void create(String userId, String orgId, String staffCode, String fullName, String phone,
                       String email, String createdBy) {
        jdbc.update("""
            INSERT INTO staff_profile(user_id, org_id, staff_code, full_name, full_name_unaccented,
                                      phone, email, version, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
            """, userId, orgId, staffCode, fullName, TextNormalizer.unaccent(fullName),
            phone, email, createdBy, Timestamp.from(Instant.now()));
    }

    public int updateDetails(String userId, String orgId, String fullName, String phone, String email,
                             String updatedBy, long version) {
        return jdbc.update("""
            UPDATE staff_profile
            SET full_name=?, full_name_unaccented=?, phone=?, email=?,
                version=version+1, updated_by=?, updated_at=?
            WHERE user_id=? AND org_id=? AND version=?
            """, fullName, TextNormalizer.unaccent(fullName), phone, email,
            updatedBy, Timestamp.from(Instant.now()), userId, orgId, version);
    }
}
