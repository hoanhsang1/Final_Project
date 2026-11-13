package com.mems.repository;

import com.mems.dto.StudentResponse;
import com.mems.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

@Repository
public class StudentRepository {
    private final JdbcTemplate jdbc;

    public StudentRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final RowMapper<StudentResponse> studentMapper = (rs, n) -> new StudentResponse(
        rs.getString("id"),
        rs.getString("org_id"),
        rs.getString("student_code"),
        rs.getString("full_name"),
        rs.getDate("date_of_birth") != null ? rs.getDate("date_of_birth").toLocalDate() : null,
        rs.getString("email"),
        rs.getString("phone"),
        rs.getString("status"),
        rs.getString("class_id"),
        rs.getString("class_code"),
        rs.getString("class_name"),
        rs.getString("created_by"),
        rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toInstant() : null,
        rs.getTimestamp("updated_at") != null ? rs.getTimestamp("updated_at").toInstant() : null
    );

    public Map<String, Object> list(String orgId, int page, int size, String status, String classId, String q) {
        if (page < 1) page = 1;
        if (size < 1) size = 20;
        if (size > 100) size = 100;

        StringBuilder where = new StringBuilder(" WHERE s.org_id = ? AND s.deleted_at IS NULL ");
        List<Object> params = new ArrayList<>();
        params.add(orgId);

        if (status != null && !status.isBlank()) {
            where.append(" AND s.status = ? ");
            params.add(status.trim().toLowerCase());
        }

        if (classId != null && !classId.isBlank()) {
            where.append(" AND cs.class_id = ? ");
            params.add(classId.trim());
        }

        if (q != null && !q.isBlank()) {
            where.append(" AND (LOWER(s.full_name) LIKE ? OR LOWER(s.student_code) LIKE ?) ");
            String term = "%" + q.trim().toLowerCase() + "%";
            params.add(term);
            params.add(term);
        }

        String countSql = "SELECT COUNT(DISTINCT s.id) FROM student s "
            + "LEFT JOIN class_student cs ON cs.student_id = s.id AND cs.org_id = s.org_id "
            + where;
        Long total = jdbc.queryForObject(countSql, Long.class, params.toArray());
        if (total == null) total = 0L;

        int offset = (page - 1) * size;
        String querySql = """
            SELECT s.id, s.org_id, s.student_code, s.full_name, s.date_of_birth, s.email, s.phone, s.status,
                   cs.class_id, sc.class_code, sc.name AS class_name,
                   s.created_by, s.created_at, s.updated_at
            FROM student s
            LEFT JOIN class_student cs ON cs.student_id = s.id AND cs.org_id = s.org_id
            LEFT JOIN school_class sc ON sc.id = cs.class_id AND sc.deleted_at IS NULL
            """ + where + " ORDER BY s.student_code ASC LIMIT ? OFFSET ?";

        List<Object> queryParams = new ArrayList<>(params);
        queryParams.add(size);
        queryParams.add(offset);

        List<StudentResponse> items = jdbc.query(querySql, studentMapper, queryParams.toArray());

        return Map.of(
            "items", items,
            "total", total,
            "page", page,
            "size", size
        );
    }

    public StudentResponse require(String id, String orgId, boolean lock) {
        String sql = """
            SELECT s.id, s.org_id, s.student_code, s.full_name, s.date_of_birth, s.email, s.phone, s.status,
                   cs.class_id, sc.class_code, sc.name AS class_name,
                   s.created_by, s.created_at, s.updated_at
            FROM student s
            LEFT JOIN class_student cs ON cs.student_id = s.id AND cs.org_id = s.org_id
            LEFT JOIN school_class sc ON sc.id = cs.class_id AND sc.deleted_at IS NULL
            WHERE s.id = ? AND s.org_id = ? AND s.deleted_at IS NULL
            """ + (lock ? " FOR UPDATE" : "");

        List<StudentResponse> rows = jdbc.query(sql, studentMapper, id, orgId);
        if (rows.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "STUDENT_NOT_FOUND", "Student not found");
        }
        return rows.get(0);
    }

    public void checkStudentCodeAvailable(String orgId, String studentCode) {
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM student WHERE org_id = ? AND student_code = ?",
            Integer.class, orgId, studentCode
        );
        if (count != null && count > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "CONFLICT", "Student code already exists in organization");
        }
    }

    public StudentResponse create(String id, String orgId, String studentCode, String fullName,
                                  Date dob, String email, String phone, String status, String createdBy) {
        Instant now = Instant.now();
        jdbc.update(
            """
            INSERT INTO student(id, org_id, student_code, full_name, date_of_birth, email, phone, status, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            id, orgId, studentCode, fullName, dob, email, phone,
            status != null && !status.isBlank() ? status.trim().toLowerCase() : "active",
            createdBy, Timestamp.from(now)
        );
        return require(id, orgId, false);
    }

    public StudentResponse update(String id, String orgId, String fullName, Date dob, String email, String phone, String status) {
        Instant now = Instant.now();
        jdbc.update(
            """
            UPDATE student SET full_name = ?, date_of_birth = ?, email = ?, phone = ?, status = ?, updated_at = ?
            WHERE id = ? AND org_id = ? AND deleted_at IS NULL
            """,
            fullName, dob, email, phone,
            status != null && !status.isBlank() ? status.trim().toLowerCase() : "active",
            Timestamp.from(now), id, orgId
        );
        return require(id, orgId, false);
    }

    public void delete(String id, String orgId) {
        jdbc.update("DELETE FROM class_student WHERE student_id = ? AND org_id = ?", id, orgId);
        jdbc.update(
            "UPDATE student SET deleted_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND org_id = ? AND deleted_at IS NULL",
            id, orgId
        );
    }

    public List<StudentResponse> findByClassId(String classId, String orgId) {
        String sql = """
            SELECT s.id, s.org_id, s.student_code, s.full_name, s.date_of_birth, s.email, s.phone, s.status,
                   cs.class_id, sc.class_code, sc.name AS class_name,
                   s.created_by, s.created_at, s.updated_at
            FROM student s
            JOIN class_student cs ON cs.student_id = s.id AND cs.org_id = s.org_id
            JOIN school_class sc ON sc.id = cs.class_id AND sc.deleted_at IS NULL
            WHERE cs.class_id = ? AND s.org_id = ? AND s.deleted_at IS NULL
            ORDER BY s.student_code ASC
            """;
        return jdbc.query(sql, studentMapper, classId, orgId);
    }
}

