package com.mems.repository;

import com.mems.dto.SubjectResponse;
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
class SubjectRepositoryTest {

    @Autowired
    private JdbcTemplate jdbc;

    private SubjectRepository subjects;

    @BeforeEach
    void setUp() {
        subjects = new SubjectRepository(jdbc);
    }

    @Test
    @DisplayName("Tạo môn trả mã, mô tả và trạng thái hoạt động")
    void createReturnsFullSubject() {
        SubjectResponse created = subjects.create("org-1", "TOAN10", "Toán 10", "Đại số", "user-1");

        assertThat(created.code()).isEqualTo("TOAN10");
        assertThat(created.description()).isEqualTo("Đại số");
        assertThat(created.active()).isTrue();
        assertThat(created.updatedAt()).isNull();
    }

    @Test
    @DisplayName("Danh sách mặc định ẩn môn đã ngừng dùng, includeInactive hiện lại")
    void listHidesInactiveUnlessRequested() {
        subjects.create("org-1", "TOAN10", "Toán 10", null, "user-1");
        SubjectResponse retired = subjects.create("org-1", "TIN10", "Tin 10", null, "user-1");
        subjects.setActive(retired.id(), "org-1", false, "user-1");

        assertThat(subjects.list("org-1", null, false))
            .extracting(SubjectResponse::name).containsExactly("Toán 10");
        assertThat(subjects.list("org-1", null, true))
            .extracting(SubjectResponse::name).containsExactly("Toán 10", "Tin 10");
    }

    @Test
    @DisplayName("Tìm kiếm không phân biệt dấu")
    void searchIgnoresAccents() {
        subjects.create("org-1", null, "Toán 10", null, "user-1");

        assertThat(subjects.list("org-1", "toan", false))
            .extracting(SubjectResponse::name).containsExactly("Toán 10");
    }

    @Test
    @DisplayName("Mã môn trùng trong tổ chức bị chặn")
    void duplicateCodeIsRejected() {
        subjects.create("org-1", "TOAN10", "Toán 10", null, "user-1");

        assertThatThrownBy(() -> subjects.create("org-1", "TOAN10", "Toán nâng cao", null, "user-1"))
            .isInstanceOf(AppException.class)
            .hasMessageContaining("Mã môn học");
    }

    @Test
    @DisplayName("Tên môn trùng trong tổ chức bị chặn, tổ chức khác thì độc lập")
    void duplicateNameIsScopedToOrganization() {
        subjects.create("org-1", null, "Toán", null, "user-1");

        assertThatThrownBy(() -> subjects.create("org-1", null, "Toán", null, "user-1"))
            .isInstanceOf(AppException.class);
        assertThat(subjects.create("org-2", null, "Toán", null, "user-2").name()).isEqualTo("Toán");
    }

    @Test
    @DisplayName("Cập nhật đổi môn và trả updatedAt")
    void updateChangesSubject() {
        SubjectResponse created = subjects.create("org-1", "TOAN10", "Toán 10", null, "user-1");

        SubjectResponse updated = subjects.update(created.id(), "org-1", "TOAN11", "Toán 11",
            "Lớp 11", "user-2");

        assertThat(updated.code()).isEqualTo("TOAN11");
        assertThat(updated.name()).isEqualTo("Toán 11");
        assertThat(updated.description()).isEqualTo("Lớp 11");
        assertThat(updated.updatedAt()).isNotNull();
    }

    @Test
    @DisplayName("Môn của tổ chức khác không đọc được")
    void requireRejectsOtherOrganization() {
        SubjectResponse created = subjects.create("org-1", null, "Toán", null, "user-1");

        assertThatThrownBy(() -> subjects.require(created.id(), "org-2"))
            .isInstanceOf(AppException.class)
            .hasMessageContaining("Subject not found");
    }

    @Test
    @DisplayName("Đếm số lớp đang dùng môn, bỏ qua lớp đã xoá")
    void classUsageCountsActiveClasses() {
        SubjectResponse subject = subjects.create("org-1", null, "Toán", null, "user-1");
        insertClass("class-1", "org-1", subject.id(), null);
        insertClass("class-2", "org-1", subject.id(), Timestamp.from(Instant.now()));

        assertThat(subjects.classUsage(subject.id(), "org-1")).isEqualTo(1);
    }

    private void insertClass(String id, String orgId, String subjectId, Timestamp deletedAt) {
        jdbc.update("""
            INSERT INTO school_class(id, org_id, class_code, name, status, subject_id, created_by,
                                     created_at, deleted_at)
            VALUES (?, ?, ?, ?, 'DANG_HOAT_DONG', ?, 'user-1', ?, ?)
            """, id, orgId, "C-" + id, "Lớp " + id, subjectId,
            Timestamp.from(Instant.parse("2026-01-01T00:00:00Z")), deletedAt);
    }
}
