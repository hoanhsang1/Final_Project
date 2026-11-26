package com.mems.repository;

import com.mems.dto.SubjectCategoryResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@JdbcTest
class SubjectCategoryRepositoryTest {

    @Autowired
    private JdbcTemplate jdbc;

    private SubjectCategoryRepository categories;
    private SubjectRepository subjects;

    @BeforeEach
    void setUp() {
        categories = new SubjectCategoryRepository(jdbc);
        subjects = new SubjectRepository(jdbc);
    }

    @Test
    @DisplayName("Tạo category trả tên và trạng thái hoạt động, subjectCount = 0")
    void createReturnsCategory() {
        SubjectCategoryResponse created = categories.create("org-1", "Lập trình", "user-1");

        assertThat(created.name()).isEqualTo("Lập trình");
        assertThat(created.active()).isTrue();
        assertThat(created.subjectCount()).isZero();
        assertThat(created.updatedAt()).isNull();
    }

    @Test
    @DisplayName("Tên category trùng (không dấu) bị chặn trong cùng tổ chức, khác tổ chức thì độc lập")
    void duplicateNameIsScopedToOrganization() {
        categories.create("org-1", "Lập trình", "user-1");

        assertThatThrownBy(() -> categories.create("org-1", "Lap trinh", "user-1"))
            .isInstanceOf(AppException.class)
            .satisfies(e -> assertThat(((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.SUBJECT_CATEGORY_EXISTS));
        assertThat(categories.create("org-2", "Lập trình", "user-2").name()).isEqualTo("Lập trình");
    }

    @Test
    @DisplayName("Danh sách mặc định ẩn category đã ngừng, includeInactive hiện lại")
    void listHidesInactiveUnlessRequested() {
        SubjectCategoryResponse active = categories.create("org-1", "Lập trình", "user-1");
        SubjectCategoryResponse retired = categories.create("org-1", "Ngoại ngữ", "user-1");
        categories.setActive(retired.id(), "org-1", false, "user-1");

        assertThat(categories.list("org-1", false))
            .extracting(SubjectCategoryResponse::name).containsExactly("Lập trình");
        assertThat(categories.list("org-1", true))
            .extracting(SubjectCategoryResponse::name).containsExactly("Lập trình", "Ngoại ngữ");
        assertThat(active.active()).isTrue();
    }

    @Test
    @DisplayName("subjectCount đếm số môn đang gắn category trong tổ chức")
    void subjectCountReflectsAssignedSubjects() {
        SubjectCategoryResponse category = categories.create("org-1", "Lập trình", "user-1");
        subjects.create("org-1", "TIN10", "Tin 10", null, category.id(), "COMPUTER", "user-1");
        subjects.create("org-1", "TIN11", "Tin 11", null, category.id(), "COMPUTER", "user-1");
        subjects.create("org-1", "TOAN10", "Toán 10", null, "user-1");

        assertThat(categories.require(category.id(), "org-1").subjectCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("Category của tổ chức khác không đọc/sửa được")
    void requireRejectsOtherOrganization() {
        SubjectCategoryResponse created = categories.create("org-1", "Lập trình", "user-1");

        assertThatThrownBy(() -> categories.require(created.id(), "org-2"))
            .isInstanceOf(AppException.class)
            .satisfies(e -> assertThat(((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.SUBJECT_CATEGORY_NOT_FOUND));
        assertThatThrownBy(() -> categories.update(created.id(), "org-2", "Khác", "user-2"))
            .isInstanceOf(AppException.class);
    }

    @Test
    @DisplayName("Ngừng category vẫn giữ tham chiếu của môn đang dùng")
    void disablingCategoryKeepsSubjectReference() {
        SubjectCategoryResponse category = categories.create("org-1", "Lập trình", "user-1");
        var subject = subjects.create("org-1", "TIN10", "Tin 10", null, category.id(), "COMPUTER", "user-1");

        SubjectCategoryResponse disabled = categories.setActive(category.id(), "org-1", false, "user-1");

        assertThat(disabled.active()).isFalse();
        assertThat(disabled.subjectCount()).isEqualTo(1);
        assertThat(subjects.require(subject.id(), "org-1").categoryId()).isEqualTo(category.id());
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM subject WHERE id=? AND category_id=?",
            Integer.class, subject.id(), category.id())).isEqualTo(1);
    }

    @Test
    @DisplayName("Môn legacy không có category vẫn đọc được")
    void legacySubjectWithoutCategoryReadsFine() {
        var created = subjects.create("org-1", null, "Toán", null, "user-1");

        assertThat(created.createdAt()).isNotNull();
        assertThat(subjects.require(created.id(), "org-1").categoryId()).isNull();
    }
}
