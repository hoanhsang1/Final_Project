package com.mems.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@JdbcTest
class StaffProfileRepositoryTest {
    private static final Instant NOW = Instant.parse("2026-11-06T00:00:00Z");

    @Autowired
    private JdbcTemplate jdbc;

    private StaffProfileRepository staff;

    @BeforeEach
    void setUp() {
        staff = new StaffProfileRepository(jdbc);
        seed();
    }

    @Test
    @DisplayName("AC-15.03 Mã nhân sự trùng trong tổ chức bị phát hiện, tổ chức khác thì không")
    void detectsDuplicateStaffCodeWithinOrganization() {
        assertThat(staff.existsCode("org-1", "GV001")).isTrue();
        assertThat(staff.existsCode("org-1", "GV999")).isFalse();
        assertThat(staff.existsCode("org-2", "GV001")).isTrue();
    }

    @Test
    @DisplayName("AC-15.04 Email trùng không phân biệt hoa thường, bỏ qua chính người đang sửa")
    void detectsEmailRegardlessOfCaseAndExcludingSelf() {
        assertThat(staff.existsEmail("org-1", "AN@EXAMPLE.COM", "someone-else")).isTrue();
        assertThat(staff.existsEmail("org-1", "an@example.com", "t001")).isFalse();
        assertThat(staff.existsEmail("org-2", "an@example.com", "someone-else")).isFalse();
    }

    @Test
    @DisplayName("AC-15.10 Hai lần tạo cùng mã nhân sự: ràng buộc UNIQUE chặn hồ sơ thứ hai")
    void uniqueConstraintBlocksSecondProfile() {
        assertThatThrownBy(() -> jdbc.update("""
            INSERT INTO staff_profile(user_id, org_id, staff_code, full_name, full_name_unaccented,
                                      email, version, created_at)
            VALUES ('t003', 'org-1', 'GV001', 'Người Trùng Mã', 'nguoi trung ma', NULL, 0, ?)
            """, Timestamp.from(NOW)))
            .isInstanceOf(DuplicateKeyException.class);
    }

    @Test
    @DisplayName("Cập nhật hồ sơ sai version trả 0 dòng, đúng version tăng version")
    void updateUsesOptimisticLock() {
        assertThat(staff.updateDetails("t001", "org-1", "Nguyễn Văn An", null,
            "an@example.com", "actor-1", 99)).isZero();
        assertThat(staff.updateDetails("t001", "org-1", "Nguyễn Văn An", null,
            "an@example.com", "actor-1", 0)).isEqualTo(1);
        assertThat(jdbc.queryForObject(
            "SELECT version FROM staff_profile WHERE user_id='t001'", Long.class)).isEqualTo(1L);
    }

    private void seed() {
        insertDepartment("dept-1", "org-1");
        insertDepartment("dept-2", "org-2");
        insertMember("t001", "org-1", "dept-1");
        insertMember("t002", "org-2", "dept-2");
        insertStaff("t001", "org-1", "GV001", "Nguyễn Văn An", "an@example.com");
        insertStaff("t002", "org-2", "GV001", "Người Tổ Chức Khác", "other@example.com");
    }

    private void insertDepartment(String id, String orgId) {
        jdbc.update("INSERT INTO department(id, org_id, name, created_at) VALUES (?, ?, ?, ?)",
            id, orgId, "Phòng " + id, Timestamp.from(NOW));
    }

    private void insertMember(String userId, String orgId, String departmentId) {
        jdbc.update("""
            INSERT INTO department_member(user_id, org_id, department_id, role, appointed_by, appointed_at, username)
            VALUES (?, ?, ?, 'STAFF', 'owner-1', ?, ?)
            """, userId, orgId, departmentId, Timestamp.from(NOW), userId);
    }

    private void insertStaff(String userId, String orgId, String code, String name, String email) {
        jdbc.update("""
            INSERT INTO staff_profile(user_id, org_id, staff_code, full_name, full_name_unaccented,
                                      email, version, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?)
            """, userId, orgId, code, name, name.toLowerCase(), email, Timestamp.from(NOW));
    }
}
