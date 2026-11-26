package com.mems.repository;

import com.mems.dto.SubjectResponse;
import com.mems.dto.SubjectUsageResponse;
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

    @Test
    @DisplayName("Môn tạo mới có category và roomRequirement; môn legacy mặc định ANY")
    void createStoresCategoryAndRoomRequirement() {
        jdbc.update("""
            INSERT INTO subject_category(id, org_id, name, name_unaccented, is_active, created_at)
            VALUES ('cat-1', 'org-1', 'Lập trình', 'lap trinh', TRUE, ?)
            """, Timestamp.from(Instant.now()));

        SubjectResponse categorized = subjects.create("org-1", "TIN10", "Tin 10", null,
            "cat-1", "COMPUTER", "user-1");
        SubjectResponse legacy = subjects.create("org-1", "TOAN10", "Toán 10", null, "user-1");

        assertThat(categorized.categoryId()).isEqualTo("cat-1");
        assertThat(categorized.categoryName()).isEqualTo("Lập trình");
        assertThat(categorized.roomRequirement()).isEqualTo("COMPUTER");
        assertThat(legacy.categoryId()).isNull();
        assertThat(legacy.roomRequirement()).isEqualTo("ANY");
    }

    @Test
    @DisplayName("Usage đếm class_subject (bỏ CANCELLED) và curriculum_subject trong cùng tổ chức")
    void usageCountsClassSubjectsAndCurricula() {
        SubjectResponse subject = subjects.create("org-1", null, "Toán", null, "user-1");
        insertClass("class-1", "org-1", subject.id(), null);
        insertClass("class-2", "org-1", subject.id(), null);
        insertClassSubject("class-1", subject.id(), "org-1", "PLANNED", false, null);
        insertClassSubject("class-2", subject.id(), "org-1", "CANCELLED", false, null);
        insertCurriculum("cur-1", "org-1");
        insertCurriculumSubject("cur-1", subject.id(), "org-1");

        // Tổ chức khác có chương trình riêng — không được lẫn vào usage.
        SubjectResponse other = subjects.create("org-2", null, "Toán", null, "user-2");
        insertCurriculum("cur-2", "org-2");
        insertCurriculumSubject("cur-2", other.id(), "org-2");

        var usage = subjects.getUsage(subject.id(), "org-1");

        assertThat(usage.classesUsingSubject()).isEqualTo(2);
        assertThat(usage.classSubjectsUsingSubject()).isEqualTo(1);
        assertThat(usage.classSubjects()).extracting(SubjectUsageResponse.SubjectClassUsageItem::name)
            .containsExactly("Lớp class-1");
        assertThat(usage.curriculaUsingSubject()).isEqualTo(1);
        assertThat(usage.curricula()).extracting(SubjectUsageResponse.CurriculumUsageItem::code)
            .containsExactly("CT-cur-1");
    }

    private void insertClassSubject(String classId, String subjectId, String orgId, String status,
                                    boolean primary, String curriculumId) {
        jdbc.update("""
            INSERT INTO class_subject(class_id, subject_id, org_id, curriculum_id, source, is_primary,
                                      status, created_at)
            VALUES (?, ?, ?, ?, 'LEGACY', ?, ?, ?)
            """, classId, subjectId, orgId, curriculumId, primary, status,
            Timestamp.from(Instant.now()));
    }

    private void insertCurriculum(String id, String orgId) {
        jdbc.update("""
            INSERT INTO curriculum(id, org_id, code, name, name_unaccented, is_active, version,
                                   created_at)
            VALUES (?, ?, ?, ?, ?, TRUE, 0, ?)
            """, id, orgId, "CT-" + id, "Chương trình " + id, "chuong trinh " + id,
            Timestamp.from(Instant.now()));
    }

    private void insertCurriculumSubject(String curriculumId, String subjectId, String orgId) {
        jdbc.update("""
            INSERT INTO curriculum_subject(curriculum_id, subject_id, org_id, sequence_no,
                                           required_sessions, session_minutes, created_at)
            VALUES (?, ?, ?, 1, 30, 45, ?)
            """, curriculumId, subjectId, orgId, Timestamp.from(Instant.now()));
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
