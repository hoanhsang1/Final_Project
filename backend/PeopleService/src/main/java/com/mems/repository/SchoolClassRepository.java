package com.mems.repository;

import com.mems.dto.SchoolClassResponse;
import com.mems.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

@Repository
public class SchoolClassRepository {
    private final JdbcTemplate jdbc;

    public SchoolClassRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final RowMapper<SchoolClassResponse> classMapper = (rs, n) -> new SchoolClassResponse(
        rs.getString("id"),
        rs.getString("org_id"),
        rs.getString("class_code"),
        rs.getString("name"),
        rs.getString("academic_year"),
        rs.getString("status"),
        rs.getInt("student_count"),
        rs.getString("created_by"),
        rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toInstant() : null,
        rs.getTimestamp("updated_at") != null ? rs.getTimestamp("updated_at").toInstant() : null
    );

    public Map<String, Object> list(String orgId, int page, int size, String q, String status) {
        if (page < 1) page = 1;
        if (size < 1) size = 20;
        if (size > 100) size = 100;

        StringBuilder where = new StringBuilder(" WHERE c.org_id = ? AND c.deleted_at IS NULL ");
        List<Object> params = new ArrayList<>();
        params.add(orgId);

        if (status != null && !status.isBlank()) {
            where.append(" AND c.status = ? ");
            params.add(status.trim().toLowerCase());
        }

        if (q != null && !q.isBlank()) {
            where.append(" AND (LOWER(c.name) LIKE ? OR LOWER(c.class_code) LIKE ?) ");
            String term = "%" + q.trim().toLowerCase() + "%";
            params.add(term);
            params.add(term);
        }

        String countSql = "SELECT COUNT(*) FROM school_class c " + where;
        Long total = jdbc.queryForObject(countSql, Long.class, params.toArray());
        if (total == null) total = 0L;

        int offset = (page - 1) * size;
        String querySql = """
            SELECT c.id, c.org_id, c.class_code, c.name, c.academic_year, c.status,
                   COUNT(cs.student_id) AS student_count,
                   c.created_by, c.created_at, c.updated_at
            FROM school_class c
            LEFT JOIN class_student cs ON cs.class_id = c.id AND cs.org_id = c.org_id
            """ + where + """
            GROUP BY c.id, c.org_id, c.class_code, c.name, c.academic_year, c.status, c.created_by, c.created_at, c.updated_at
            ORDER BY c.class_code ASC LIMIT ? OFFSET ?
            """;

        List<Object> queryParams = new ArrayList<>(params);
        queryParams.add(size);
        queryParams.add(offset);

        List<SchoolClassResponse> items = jdbc.query(querySql, classMapper, queryParams.toArray());

        return Map.of(
            "items", items,
            "total", total,
            "page", page,
            "size", size
        );
    }

    public SchoolClassResponse require(String id, String orgId, boolean lock) {
        String sql = """
            SELECT c.id, c.org_id, c.class_code, c.name, c.academic_year, c.status,
                   COUNT(cs.student_id) AS student_count,
                   c.created_by, c.created_at, c.updated_at
            FROM school_class c
            LEFT JOIN class_student cs ON cs.class_id = c.id AND cs.org_id = c.org_id
            WHERE c.id = ? AND c.org_id = ? AND c.deleted_at IS NULL
            GROUP BY c.id, c.org_id, c.class_code, c.name, c.academic_year, c.status, c.created_by, c.created_at, c.updated_at
            """ + (lock ? " FOR UPDATE" : "");

        List<SchoolClassResponse> rows = jdbc.query(sql, classMapper, id, orgId);
        if (rows.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "CLASS_NOT_FOUND", "Class not found");
        }
        return rows.get(0);
    }

    public void checkClassCodeAvailable(String orgId, String classCode) {
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM school_class WHERE org_id = ? AND class_code = ?",
            Integer.class, orgId, classCode
        );
        if (count != null && count > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "CONFLICT", "Class code already exists in organization");
        }
    }

    public SchoolClassResponse create(String id, String orgId, String classCode, String name,
                                      String academicYear, String status, String createdBy) {
        Instant now = Instant.now();
        jdbc.update(
            """
            INSERT INTO school_class(id, org_id, class_code, name, academic_year, status, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            id, orgId, classCode, name, academicYear,
            status != null && !status.isBlank() ? status.trim().toLowerCase() : "active",
            createdBy, Timestamp.from(now)
        );
        return require(id, orgId, false);
    }

    public SchoolClassResponse update(String id, String orgId, String name, String academicYear, String status) {
        Instant now = Instant.now();
        jdbc.update(
            """
            UPDATE school_class SET name = ?, academic_year = ?, status = ?, updated_at = ?
            WHERE id = ? AND org_id = ? AND deleted_at IS NULL
            """,
            name, academicYear,
            status != null && !status.isBlank() ? status.trim().toLowerCase() : "active",
            Timestamp.from(now), id, orgId
        );
        return require(id, orgId, false);
    }

    public void delete(String id, String orgId) {
        Integer students = jdbc.queryForObject(
            "SELECT COUNT(*) FROM class_student WHERE class_id = ? AND org_id = ?",
            Integer.class, id, orgId
        );
        if (students != null && students > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "CLASS_NOT_EMPTY", "Cannot delete class with enrolled students");
        }
        jdbc.update(
            "UPDATE school_class SET deleted_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND org_id = ? AND deleted_at IS NULL",
            id, orgId
        );
    }

    public void enrollStudent(String classId, String studentId, String orgId) {
        List<String> currentClasses = jdbc.queryForList(
            "SELECT class_id FROM class_student WHERE student_id = ? AND org_id = ?",
            String.class, studentId, orgId
        );
        if (!currentClasses.isEmpty()) {
            if (currentClasses.contains(classId)) {
                return; // already enrolled in this class
            }
            throw new ApiException(HttpStatus.CONFLICT, "STUDENT_ALREADY_IN_CLASS", "Student is already enrolled in another class");
        }

        jdbc.update(
            "INSERT INTO class_student(class_id, student_id, org_id, enrolled_at) VALUES (?, ?, ?, ?)",
            classId, studentId, orgId, Timestamp.from(Instant.now())
        );
    }

    public void removeStudent(String classId, String studentId, String orgId) {
        jdbc.update(
            "DELETE FROM class_student WHERE class_id = ? AND student_id = ? AND org_id = ?",
            classId, studentId, orgId
        );
    }
}

