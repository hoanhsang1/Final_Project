package com.mems.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@JdbcTest
@Import(DefaultPositionSeeder.class)
class DefaultPositionSeederTest {

    @Autowired
    private DefaultPositionSeeder seeder;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    @DisplayName("Tổ chức mới: tạo đủ 7 chức vụ mẫu, Giáo viên có profile_type=TEACHER")
    void seedsDefaultsForNewOrganization() {
        seeder.ensureForOrg("org-new");

        assertThat(countPositions("org-new")).isEqualTo(7);
        assertThat(profileType("org-new", "Giáo viên")).isEqualTo("TEACHER");
        assertThat(profileType("org-new", "Giáo vụ")).isEqualTo("GENERAL");
        assertThat(permissions("org-new", "Giáo viên"))
            .containsExactly("CLASS_VIEW", "SCHEDULE_VIEW", "STUDENT_VIEW");
        assertThat(permissions("org-new", "Quản trị viên tổ chức")).hasSize(18);
    }

    @Test
    @DisplayName("Chạy seed 2 lần: không nhân đôi chức vụ/quyền")
    void seedingTwiceDoesNotDuplicate() {
        seeder.ensureForOrg("org-twice");
        seeder.ensureForOrg("org-twice");

        assertThat(countPositions("org-twice")).isEqualTo(7);
        Integer links = jdbc.queryForObject("""
            SELECT COUNT(*) FROM position_permission pp
            JOIN position p ON p.id = pp.position_id
            WHERE p.org_id = ? AND p.name = 'Giáo viên'
            """, Integer.class, "org-twice");
        assertThat(links).isEqualTo(3);
    }

    @Test
    @DisplayName("Chức vụ owner đã chỉnh tay không bị ghi đè, các chức vụ mẫu còn thiếu vẫn được bổ sung")
    void existingOwnerEditedPositionIsNotOverwritten() {
        jdbc.update("""
            INSERT INTO position(id, org_id, name, description, created_at, profile_type)
            VALUES (?, ?, ?, ?, ?, ?)
            """, "pos-custom", "org-existing", "Giáo vụ", "Owner description", Timestamp.from(Instant.now()), "GENERAL");
        jdbc.update("INSERT INTO position_permission(position_id, permission_code) VALUES (?, ?)",
            "pos-custom", "FACILITY_MANAGE");

        seeder.ensureForOrg("org-existing");

        assertThat(countPositions("org-existing")).isEqualTo(7);
        assertThat(jdbc.queryForObject(
            "SELECT description FROM position WHERE org_id=? AND name='Giáo vụ'", String.class, "org-existing"))
            .isEqualTo("Owner description");
        assertThat(permissions("org-existing", "Giáo vụ")).containsExactly("FACILITY_MANAGE");
    }

    @Test
    @DisplayName("Tổ chức đã tồn tại (có phòng ban) được seed khi service khởi động")
    void seedsEveryKnownOrganization() {
        insertDepartment("dept-a", "org-a");
        insertDepartment("dept-b", "org-b");

        seeder.ensureForAllOrganizations();

        assertThat(countPositions("org-a")).isEqualTo(7);
        assertThat(countPositions("org-b")).isEqualTo(7);
    }

    private Integer countPositions(String orgId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM position WHERE org_id=?", Integer.class, orgId);
    }

    private String profileType(String orgId, String name) {
        return jdbc.queryForObject(
            "SELECT profile_type FROM position WHERE org_id=? AND name=?", String.class, orgId, name);
    }

    private List<String> permissions(String orgId, String name) {
        return jdbc.queryForList("""
            SELECT pp.permission_code FROM position_permission pp
            JOIN position p ON p.id = pp.position_id
            WHERE p.org_id = ? AND p.name = ? ORDER BY pp.permission_code
            """, String.class, orgId, name);
    }

    private void insertDepartment(String id, String orgId) {
        jdbc.update("""
            INSERT INTO department(id, org_id, name, description, created_at)
            VALUES (?, ?, ?, ?, ?)
            """, id, orgId, "Department " + id, null, Timestamp.from(Instant.now()));
    }
}
