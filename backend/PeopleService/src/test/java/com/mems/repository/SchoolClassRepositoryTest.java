package com.mems.repository;

import com.mems.dto.SchoolClassResponse;
import com.mems.exception.AppException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@JdbcTest
class SchoolClassRepositoryTest {
    private static final Instant NOW = Instant.parse("2026-11-06T00:00:00Z");

    @Autowired
    private JdbcTemplate jdbc;

    private SchoolClassRepository classes;

    @BeforeEach
    void setUp() {
        classes = new SchoolClassRepository(jdbc);
        seed();
    }

    @Test
    @DisplayName("Danh sách lớp trả giáo viên phụ trách, teacher null khi chưa gán")
    void listIncludesTeacher() {
        List<SchoolClassResponse> items = list(null, null);

        assertThat(items).extracting(SchoolClassResponse::classCode).containsExactly("C001", "C002");
        assertThat(items.get(0).teacher().id()).isEqualTo("user-1");
        assertThat(items.get(0).teacher().code()).isEqualTo("GV001");
        assertThat(items.get(0).teacher().fullName()).isEqualTo("Nguyễn Văn An");
        assertThat(items.get(1).teacher()).isNull();
    }

    @Test
    @DisplayName("Lọc trạng thái chấp nhận cả giá trị cũ lẫn giá trị Sprint 4")
    void listNormalizesStatusFilter() {
        assertThat(list("active", null)).extracting(SchoolClassResponse::classCode).containsExactly("C001");
        assertThat(list("DA_HUY", null)).extracting(SchoolClassResponse::classCode).containsExactly("C002");
    }

    @Test
    @DisplayName("Chi tiết lớp khoá dòng và trả đúng teacher/version")
    void requireWithLockReturnsTeacher() {
        SchoolClassResponse found = classes.require("class-1", "org-1", true);

        assertThat(found.teacher().code()).isEqualTo("GV001");
        assertThat(found.version()).isZero();
    }

    @Test
    @DisplayName("Gán giáo viên đúng version đổi teacher và tăng version")
    void assignTeacherUpdatesTeacherAndVersion() {
        assertThat(classes.assignTeacher("class-2", "org-1", "user-1", 0)).isEqualTo(1);

        SchoolClassResponse updated = classes.require("class-2", "org-1", false);
        assertThat(updated.teacher().id()).isEqualTo("user-1");
        assertThat(updated.version()).isEqualTo(1);
    }

    @Test
    @DisplayName("Gán giáo viên sai version trả 0 dòng")
    void assignTeacherRejectsStaleVersion() {
        assertThat(classes.assignTeacher("class-1", "org-1", "user-1", 7)).isZero();
    }

    @Test
    @DisplayName("Không trả lớp của tổ chức khác")
    void isolatesOrganization() {
        assertThatThrownBy(() -> classes.require("class-1", "org-2", false))
            .isInstanceOf(AppException.class)
            .hasMessage("Class not found");
    }

    @SuppressWarnings("unchecked")
    private List<SchoolClassResponse> list(String status, String q) {
        Map<String, Object> result = classes.list("org-1", 1, 20, q, status, false);
        return (List<SchoolClassResponse>) result.get("items");
    }

    private void seed() {
        jdbc.update("""
            INSERT INTO department(id,org_id,name,description,created_at)
            VALUES ('dept-1','org-1','Dept',NULL,?)
            """, Timestamp.from(NOW));
        jdbc.update("""
            INSERT INTO department_member(user_id,org_id,department_id,role,appointed_by,appointed_at,username)
            VALUES ('user-1','org-1','dept-1','STAFF','owner',?,'gv001')
            """, Timestamp.from(NOW));
        jdbc.update("""
            INSERT INTO staff_profile(user_id,org_id,staff_code,full_name,full_name_unaccented,
                                      phone,email,version,created_by,created_at)
            VALUES ('user-1','org-1','GV001','Nguyễn Văn An','nguyen van an',NULL,NULL,0,'owner',?)
            """, Timestamp.from(NOW));

        insertClass("class-1", "C001", "CHUA_BAT_DAU", "user-1");
        insertClass("class-2", "C002", "DA_HUY", null);
    }

    private void insertClass(String id, String code, String status, String teacherId) {
        jdbc.update("""
            INSERT INTO school_class(id,org_id,class_code,name,status,teacher_id,close_state,version,created_by,created_at)
            VALUES (?, 'org-1', ?, ?, ?, ?, 'NONE', 0, 'owner', ?)
            """, id, code, "Class " + code, status, teacherId, Timestamp.from(NOW));
    }
}
