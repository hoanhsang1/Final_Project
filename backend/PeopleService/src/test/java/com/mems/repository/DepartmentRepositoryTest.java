package com.mems.repository;

import com.mems.exception.AppException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@JdbcTest
class DepartmentRepositoryTest {
    private static final Instant NOW = Instant.parse("2026-11-13T00:00:00Z");

    @Autowired
    private JdbcTemplate jdbc;

    private DepartmentRepository departments;

    @BeforeEach
    void setUp() {
        departments = new DepartmentRepository(jdbc);
        Timestamp now = Timestamp.from(NOW);
        jdbc.update("INSERT INTO department(id,org_id,name,created_at) VALUES ('dept-1','org-1','Phòng 1',?)", now);
        jdbc.update("INSERT INTO department_module(department_id,org_id,module_code) VALUES ('dept-1','org-1','STUDENT_MANAGEMENT')");
    }

    @Test
    @DisplayName("Ngừng/xoá phòng ban còn nhân sự → DEPARTMENT_NOT_EMPTY")
    void deleteRejectsDepartmentWithMembers() {
        jdbc.update("""
            INSERT INTO department_member(user_id,org_id,department_id,role,appointed_by,appointed_at)
            VALUES ('user-1','org-1','dept-1','STAFF','admin',?)
            """, Timestamp.from(NOW));

        assertThatThrownBy(() -> departments.delete("dept-1", "org-1"))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("DEPARTMENT_NOT_EMPTY"));
    }

    @Test
    @DisplayName("Ngừng/xoá phòng ban không còn nhân sự → thành công, xoá cả module gán")
    void deleteAllowsEmptyDepartment() {
        departments.delete("dept-1", "org-1");

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM department WHERE id='dept-1'", Integer.class))
            .isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM department_module WHERE department_id='dept-1'", Integer.class))
            .isZero();
    }
}
