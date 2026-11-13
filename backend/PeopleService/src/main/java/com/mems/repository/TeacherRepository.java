package com.mems.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mems.dto.ClassMismatch;
import com.mems.dto.SpecialtyResponse;
import com.mems.dto.TeacherAssignableItem;
import com.mems.dto.TeacherClassResponse;
import com.mems.dto.TeacherHistoryResponse;
import com.mems.dto.TeacherListItem;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.service.TextNormalizer;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

@Repository
public class TeacherRepository {
    private final JdbcTemplate jdbc;
    private final SpecialtyRepository specialties;
    private final ObjectMapper mapper;

    public TeacherRepository(JdbcTemplate jdbc, SpecialtyRepository specialties, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.specialties = specialties;
        this.mapper = mapper;
    }

    public record TeacherRow(
        String userId, String orgId, String staffCode, String fullName, String email, String phone,
        String departmentId, String role, String contractType, String teachingStatus,
        long version, Instant createdAt, Instant updatedAt
    ) {}

    public TeacherRow requireTeacher(String userId, String orgId, boolean lock) {
        List<TeacherRow> rows = jdbc.query("""
            SELECT sp.user_id, sp.org_id, sp.staff_code, sp.full_name, sp.email, sp.phone,
                   dm.department_id, dm.role, tp.contract_type, tp.teaching_status,
                   sp.version, sp.created_at, sp.updated_at
            FROM teacher_profile tp
            JOIN staff_profile sp ON sp.user_id=tp.user_id AND sp.org_id=tp.org_id
            JOIN department_member dm ON dm.user_id=sp.user_id AND dm.org_id=sp.org_id
            WHERE tp.user_id=? AND tp.org_id=?
            """ + (lock ? " FOR UPDATE" : ""),
            (rs, n) -> new TeacherRow(
                rs.getString("user_id"), rs.getString("org_id"), rs.getString("staff_code"),
                rs.getString("full_name"), rs.getString("email"), rs.getString("phone"),
                rs.getString("department_id"), rs.getString("role"), rs.getString("contract_type"),
                rs.getString("teaching_status"), rs.getLong("version"),
                rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toInstant() : null,
                rs.getTimestamp("updated_at") != null ? rs.getTimestamp("updated_at").toInstant() : null
            ), userId, orgId);
        if (rows.isEmpty()) {
            throw new AppException(ErrorCode.TEACHER_NOT_FOUND);
        }
        return rows.get(0);
    }

    public boolean hasTeacherPosition(String userId, String orgId) {
        Integer count = jdbc.queryForObject("""
            SELECT COUNT(*) FROM member_position mp
            JOIN `position` p ON p.id=mp.position_id AND p.org_id=mp.org_id
            WHERE mp.user_id=? AND mp.org_id=? AND p.profile_type='TEACHER'
            """, Integer.class, userId, orgId);
        return count != null && count > 0;
    }

    public boolean hasProfile(String userId, String orgId) {
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM teacher_profile WHERE user_id=? AND org_id=?", Integer.class, userId, orgId);
        return count != null && count > 0;
    }

    public void createProfile(String userId, String orgId, String contractType, String createdBy) {
        jdbc.update("""
            INSERT INTO teacher_profile(user_id, org_id, contract_type, teaching_status, version, created_by, created_at)
            VALUES (?, ?, ?, 'DANG_DAY', 0, ?, ?)
            """, userId, orgId, contractType, createdBy, Timestamp.from(Instant.now()));
    }

    public void replaceSpecialties(String userId, String orgId, Collection<String> specialtyIds) {
        jdbc.update("DELETE FROM teacher_specialty WHERE user_id=? AND org_id=?", userId, orgId);
        specialtyIds.stream().sorted().forEach(id -> jdbc.update(
            "INSERT INTO teacher_specialty(user_id, specialty_id, org_id) VALUES (?, ?, ?)", userId, id, orgId));
    }

    public void updateContract(String userId, String orgId, String contractType, String updatedBy) {
        jdbc.update("""
            UPDATE teacher_profile
            SET contract_type=?, version=version+1, updated_by=?, updated_at=?
            WHERE user_id=? AND org_id=?
            """, contractType, updatedBy, Timestamp.from(Instant.now()), userId, orgId);
    }

    public Map<String, Object> list(String orgId, String departmentId, String q, String specialtyId,
                                    String teachingStatus, int page, int size) {
        page = normalizePage(page);
        size = normalizeSize(size);
        StringBuilder where = new StringBuilder("""
             WHERE tp.org_id=? AND EXISTS (
                SELECT 1 FROM member_position mp
                JOIN `position` p ON p.id=mp.position_id AND p.org_id=mp.org_id
                WHERE mp.user_id=sp.user_id AND mp.org_id=sp.org_id AND p.profile_type='TEACHER'
             )
            """);
        List<Object> params = new ArrayList<>();
        params.add(orgId);
        appendFilters(where, params, departmentId, q, specialtyId, teachingStatus);

        Long total = jdbc.queryForObject("""
            SELECT COUNT(*) FROM teacher_profile tp
            JOIN staff_profile sp ON sp.user_id=tp.user_id AND sp.org_id=tp.org_id
            JOIN department_member dm ON dm.user_id=sp.user_id AND dm.org_id=sp.org_id
            """ + where, Long.class, params.toArray());
        if (total == null) total = 0L;

        List<Object> queryParams = new ArrayList<>(params);
        queryParams.add(size);
        queryParams.add((page - 1) * size);
        List<RawTeacher> raw = jdbc.query("""
            SELECT sp.user_id, sp.staff_code, sp.full_name, sp.email, sp.phone, dm.department_id,
                   tp.contract_type, tp.teaching_status,
                   (SELECT COUNT(*) FROM school_class sc
                    WHERE sc.teacher_id=sp.user_id AND sc.org_id=sp.org_id
                      AND sc.deleted_at IS NULL
                      AND sc.status IN ('CHUA_BAT_DAU','DANG_DIEN_RA')) AS class_count
            FROM teacher_profile tp
            JOIN staff_profile sp ON sp.user_id=tp.user_id AND sp.org_id=tp.org_id
            JOIN department_member dm ON dm.user_id=sp.user_id AND dm.org_id=sp.org_id
            """ + where + " ORDER BY sp.staff_code ASC LIMIT ? OFFSET ?",
            (rs, n) -> new RawTeacher(rs.getString("user_id"), rs.getString("staff_code"),
                rs.getString("full_name"), rs.getString("email"), rs.getString("phone"),
                rs.getString("department_id"), rs.getString("contract_type"),
                rs.getString("teaching_status"), rs.getLong("class_count")),
            queryParams.toArray());

        Map<String, List<SpecialtyResponse>> byUser =
            specialties.forUsers(orgId, raw.stream().map(RawTeacher::userId).toList());
        List<TeacherListItem> items = raw.stream().map(row -> {
            long classCount = row.classCount();
            return new TeacherListItem(row.userId(), row.staffCode(), row.fullName(), row.email(), row.phone(),
                row.departmentId(), byUser.getOrDefault(row.userId(), List.of()),
                row.contractType(), row.teachingStatus(), classCount, classCount == 0,
                classCount == 0 ? "Chưa có lớp" : null);
        }).toList();

        return Map.of("items", items, "total", total, "page", page, "size", size,
            "pages", (total + size - 1) / size);
    }

    public Map<String, Object> assignable(String orgId, String q, int page, int size) {
        page = normalizePage(page);
        size = normalizeSize(size);
        StringBuilder where = new StringBuilder(" WHERE tp.org_id=? AND tp.teaching_status='DANG_DAY' ");
        List<Object> params = new ArrayList<>();
        params.add(orgId);
        String term = TextNormalizer.likeContains(q);
        if (term != null) {
            where.append(" AND (LOWER(sp.staff_code) LIKE ? ESCAPE '!' OR sp.full_name_unaccented LIKE ? ESCAPE '!') ");
            params.add(term);
            params.add(term);
        }

        Long total = jdbc.queryForObject("""
            SELECT COUNT(*) FROM teacher_profile tp
            JOIN staff_profile sp ON sp.user_id=tp.user_id AND sp.org_id=tp.org_id
            """ + where, Long.class, params.toArray());
        if (total == null) total = 0L;

        List<Object> queryParams = new ArrayList<>(params);
        queryParams.add(size);
        queryParams.add((page - 1) * size);
        List<RawTeacher> raw = jdbc.query("""
            SELECT sp.user_id, sp.staff_code, sp.full_name, sp.email, sp.phone, NULL AS department_id,
                   tp.contract_type, tp.teaching_status,
                   (SELECT COUNT(*) FROM school_class sc
                    WHERE sc.teacher_id=sp.user_id AND sc.org_id=sp.org_id
                      AND sc.deleted_at IS NULL
                      AND sc.status IN ('CHUA_BAT_DAU','DANG_DIEN_RA')) AS class_count
            FROM teacher_profile tp
            JOIN staff_profile sp ON sp.user_id=tp.user_id AND sp.org_id=tp.org_id
            """ + where + " ORDER BY sp.full_name_unaccented ASC, sp.staff_code ASC LIMIT ? OFFSET ?",
            (rs, n) -> new RawTeacher(rs.getString("user_id"), rs.getString("staff_code"),
                rs.getString("full_name"), rs.getString("email"), rs.getString("phone"),
                null, rs.getString("contract_type"), rs.getString("teaching_status"),
                rs.getLong("class_count")),
            queryParams.toArray());

        Map<String, List<SpecialtyResponse>> byUser =
            specialties.forUsers(orgId, raw.stream().map(RawTeacher::userId).toList());
        List<TeacherAssignableItem> items = raw.stream().map(row -> new TeacherAssignableItem(
            row.userId(), row.staffCode(), row.fullName(),
            byUser.getOrDefault(row.userId(), List.of()), row.classCount(), row.teachingStatus())).toList();

        return Map.of("items", items, "total", total, "page", page, "size", size,
            "pages", (total + size - 1) / size);
    }

    public List<TeacherClassResponse> classes(String userId, String orgId) {
        return jdbc.query("""
            SELECT id, class_code, name, status, close_state
            FROM school_class
            WHERE teacher_id=? AND org_id=? AND deleted_at IS NULL
            ORDER BY class_code
            """, (rs, n) -> {
                String closeState = rs.getString("close_state");
                return new TeacherClassResponse(rs.getString("id"), rs.getString("class_code"),
                    rs.getString("name"), rs.getString("status"), closeState, closeLabel(closeState));
            }, userId, orgId);
    }

    public List<TeacherHistoryResponse> history(String userId, String orgId) {
        return jdbc.query("""
            SELECT a.id, a.action, a.actor_user_id, a.details, a.created_at,
                   sp.full_name AS actor_name
            FROM people_audit_log a
            LEFT JOIN staff_profile sp ON sp.user_id = a.actor_user_id AND sp.org_id = a.org_id
            WHERE a.org_id=? AND a.target_id=? AND a.action IN ('TEACHER_CREATED','TEACHER_UPDATED')
            ORDER BY a.created_at DESC
            """, (rs, n) -> new TeacherHistoryResponse(
                rs.getString("id"), rs.getString("action"), rs.getString("actor_user_id"),
                rs.getString("actor_name"),
                rs.getTimestamp("created_at").toInstant(), parseDetails(rs.getString("details"))),
            orgId, userId);
    }

    public List<ClassMismatch> subjectMismatch(String userId, String orgId, Collection<String> specialtyIds) {
        if (specialtyIds == null || specialtyIds.isEmpty()) return List.of();
        String placeholders = String.join(",", Collections.nCopies(specialtyIds.size(), "?"));
        List<Object> params = new ArrayList<>();
        params.add(userId);
        params.add(orgId);
        params.addAll(specialtyIds);
        return jdbc.query("""
            SELECT sc.id, sc.name
            FROM school_class sc
            JOIN subject sub ON sub.id=sc.subject_id AND sub.org_id=sc.org_id
            WHERE sc.teacher_id=? AND sc.org_id=? AND sc.deleted_at IS NULL
              AND sc.status IN ('CHUA_BAT_DAU','DANG_DIEN_RA')
              AND NOT EXISTS (
                SELECT 1 FROM specialty s
                WHERE s.org_id=sc.org_id AND s.name_unaccented=sub.name_unaccented
                  AND s.id IN (""" + placeholders + """
                )
              )
            ORDER BY sc.class_code
            """, (rs, n) -> new ClassMismatch(rs.getString("id"), rs.getString("name")),
            params.toArray());
    }

    private void appendFilters(StringBuilder where, List<Object> params, String departmentId,
                               String q, String specialtyId, String teachingStatus) {
        if (departmentId != null && !departmentId.isBlank()) {
            where.append(" AND dm.department_id=? ");
            params.add(departmentId);
        }
        String term = TextNormalizer.likeContains(q);
        if (term != null) {
            where.append(" AND (LOWER(sp.staff_code) LIKE ? ESCAPE '!' OR sp.full_name_unaccented LIKE ? ESCAPE '!') ");
            params.add(term);
            params.add(term);
        }
        if (specialtyId != null && !specialtyId.isBlank()) {
            where.append("""
                 AND EXISTS (SELECT 1 FROM teacher_specialty ts
                             WHERE ts.user_id=sp.user_id AND ts.org_id=sp.org_id AND ts.specialty_id=?)
                """);
            params.add(specialtyId.trim());
        }
        if (teachingStatus != null && !teachingStatus.isBlank()) {
            where.append(" AND tp.teaching_status=? ");
            params.add(teachingStatus.trim().toUpperCase(Locale.ROOT));
        }
    }

    private Object parseDetails(String json) {
        if (json == null) return null;
        try {
            return mapper.readValue(json, Object.class);
        } catch (JsonProcessingException ex) {
            return json;
        }
    }

    private String closeLabel(String closeState) {
        if ("PENDING".equals(closeState)) return "Chờ duyệt đóng";
        if ("CLOSED".equals(closeState)) return "Đã đóng";
        return null;
    }

    private int normalizePage(int page) {
        return page < 1 ? 1 : page;
    }

    private int normalizeSize(int size) {
        if (size < 1) return 20;
        return Math.min(size, 100);
    }

    private record RawTeacher(String userId, String staffCode, String fullName, String email, String phone,
                              String departmentId, String contractType, String teachingStatus, long classCount) {}
}
