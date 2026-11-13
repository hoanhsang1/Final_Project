package com.mems.repository;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mems.dto.TeacherAssignableItem;
import com.mems.dto.TeacherListItem;
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
class TeacherRepositoryTest {
    private static final Instant NOW = Instant.parse("2026-11-06T00:00:00Z");

    @Autowired
    private JdbcTemplate jdbc;

    private SpecialtyRepository specialties;
    private StaffProfileRepository staff;
    private TeacherRepository teachers;

    @BeforeEach
    void setUp() {
        specialties = new SpecialtyRepository(jdbc);
        staff = new StaffProfileRepository(jdbc);
        teachers = new TeacherRepository(jdbc, specialties, new ObjectMapper());
        seed();
    }

    @Test
    @DisplayName("Lọc giáo viên theo tên không dấu, mã, chuyên môn, trạng thái và phòng ban")
    void filtersTeachers() {
        assertThat(list("nguyen", null, null, null)).extracting(TeacherListItem::staffCode)
            .containsExactly("GV001");
        assertThat(list(null, "sp-toan", null, null)).extracting(TeacherListItem::staffCode)
            .containsExactlyInAnyOrder("GV001", "GV003");
        assertThat(list(null, null, "TAM_NGHI", null)).extracting(TeacherListItem::staffCode)
            .containsExactly("GV003");
        assertThat(list(null, null, null, "dept-1")).extracting(TeacherListItem::staffCode)
            .containsExactly("GV001", "GV002");
    }

    @Test
    @DisplayName("Đếm lớp đang phụ trách và nhãn Chưa có lớp")
    void countsActiveClasses() {
        Map<String, TeacherListItem> items = list(null, null, null, null).stream()
            .collect(java.util.stream.Collectors.toMap(TeacherListItem::staffCode, item -> item));
        assertThat(items.get("GV001").classCount()).isEqualTo(1);
        assertThat(items.get("GV001").noClass()).isFalse();
        assertThat(items.get("GV003").classCount()).isZero();
        assertThat(items.get("GV003").noClass()).isTrue();
    }

    @Test
    @DisplayName("Danh sách assignable chỉ gồm DANG_DAY trong toàn tổ chức")
    void assignableOnlyActiveTeachers() {
        Map<String, Object> result = teachers.assignable("org-1", null, 1, 20);
        @SuppressWarnings("unchecked")
        List<TeacherAssignableItem> items = (List<TeacherAssignableItem>) result.get("items");
        assertThat(items).extracting(TeacherAssignableItem::staffCode)
            .containsExactlyInAnyOrder("GV001", "GV002");
    }

    @Test
    @DisplayName("Phát hiện lớp có môn không còn khớp chuyên môn mới (bỏ qua lớp đã kết thúc)")
    void detectsSpecialtyMismatch() {
        var mismatches = teachers.subjectMismatch("user-1", "org-1", List.of("sp-ly"));
        assertThat(mismatches).extracting(m -> m.id()).containsExactly("class-1");
    }

    @Test
    @DisplayName("Giáo viên của tổ chức khác không tra cứu được")
    void rejectsTeacherFromOtherOrganization() {
        assertThatThrownBy(() -> teachers.requireTeacher("user-1", "org-2", false))
            .isInstanceOf(com.mems.exception.ApiException.class)
            .hasMessage("Teacher not found");
    }

    @Test
    @DisplayName("Nhập tên chuyên môn có dấu/khoảng trắng vẫn phát hiện trùng sau chuẩn hóa")
    void specialtyNameIsNormalized() {
        assertThat(specialties.existsName("org-1", com.mems.service.TextNormalizer.unaccent("  TOÁN ")))
            .isTrue();
    }

    @Test
    @DisplayName("Cập nhật hồ sơ sai version trả 0 dòng, đúng version tăng version")
    void updateUsesOptimisticLock() {
        assertThat(staff.updateDetails("user-1", "org-1", "New Name", null, null, "actor", 99)).isZero();
        assertThat(staff.updateDetails("user-1", "org-1", "New Name", null, null, "actor", 0)).isEqualTo(1);
        assertThat(staff.find("user-1", "org-1").orElseThrow().version()).isEqualTo(1);
    }

    @Test
    @DisplayName("AC-16.09 Từ khóa chứa % _ ' được escape, không khớp toàn bộ và không gây lỗi SQL")
    void escapesWildcardCharacters() {
        insertMember("user-4", "org-1", "dept-1", "GV_100", "100% Năng Lực", "DANG_DAY");

        assertThat(list("%", null, null, null)).extracting(TeacherListItem::staffCode)
            .containsExactly("GV_100");
        assertThat(list("_", null, null, null)).extracting(TeacherListItem::staffCode)
            .containsExactly("GV_100");
        assertThat(list("'", null, null, null)).isEmpty();
    }

    @Test
    @DisplayName("AC-16.07 Phân trang: page/size biên được chuẩn hóa, total/pages đúng")
    void paginationClampsPageAndSize() {
        Map<String, Object> clamped = teachers.list("org-1", null, null, null, null, 0, 0);
        assertThat(clamped.get("page")).isEqualTo(1);
        assertThat(clamped.get("size")).isEqualTo(20);
        assertThat(clamped.get("total")).isEqualTo(3L);
        assertThat(clamped.get("pages")).isEqualTo(1L);

        Map<String, Object> capped = teachers.list("org-1", null, null, null, null, 1, 1000);
        assertThat(capped.get("size")).isEqualTo(100);

        Map<String, Object> secondPage = teachers.list("org-1", null, null, null, null, 2, 1);
        assertThat((List<?>) secondPage.get("items")).hasSize(1);
        assertThat(secondPage.get("pages")).isEqualTo(3L);
        assertThat((List<?>) teachers.list("org-1", null, null, null, null, 9, 1).get("items"))
            .isEmpty();
    }

    private List<TeacherListItem> list(String q, String specialtyId, String teachingStatus, String departmentId) {
        Map<String, Object> result = teachers.list("org-1", departmentId, q, specialtyId, teachingStatus, 1, 20);
        @SuppressWarnings("unchecked")
        List<TeacherListItem> items = (List<TeacherListItem>) result.get("items");
        return items;
    }

    private void seed() {
        insertDepartment("dept-1", "org-1");
        insertDepartment("dept-2", "org-1");
        insertPosition("pos-teacher", "org-1", "TEACHER");
        insertMember("user-1", "org-1", "dept-1", "GV001", "Nguyễn Văn An", "DANG_DAY");
        insertMember("user-2", "org-1", "dept-1", "GV002", "Trần Thị Bình", "DANG_DAY");
        insertMember("user-3", "org-1", "dept-2", "GV003", "Lê Văn Cường", "TAM_NGHI");

        insertSpecialty("sp-toan", "Toán");
        insertSpecialty("sp-ly", "Vật lý");
        jdbc.update("INSERT INTO teacher_specialty(user_id,specialty_id,org_id) VALUES (?,?,?)",
            "user-1", "sp-toan", "org-1");
        jdbc.update("INSERT INTO teacher_specialty(user_id,specialty_id,org_id) VALUES (?,?,?)",
            "user-2", "sp-ly", "org-1");
        jdbc.update("INSERT INTO teacher_specialty(user_id,specialty_id,org_id) VALUES (?,?,?)",
            "user-3", "sp-toan", "org-1");

        insertSubject("sub-toan", "Toán");
        insertSubject("sub-ly", "Vật lý");
        insertClass("class-1", "C001", "user-1", "DANG_DIEN_RA", "sub-toan");
        insertClass("class-2", "C002", "user-1", "DA_KET_THUC", "sub-toan");
        insertClass("class-3", "C003", "user-3", "DA_KET_THUC", "sub-ly");

        jdbc.update("""
            INSERT INTO people_audit_log(id,org_id,actor_user_id,action,target_id,details,created_at)
            VALUES (?,?,?,?,?,?,?)
            """, "audit-1", "org-1", "actor-1", "TEACHER_UPDATED", "user-1",
            "{\"fullName\":{\"before\":\"A\",\"after\":\"B\"}}", Timestamp.from(NOW));
    }

    private void insertDepartment(String id, String orgId) {
        jdbc.update("INSERT INTO department(id,org_id,name,description,created_at) VALUES (?,?,?,?,?)",
            id, orgId, "Dept " + id, null, Timestamp.from(NOW));
    }

    private void insertPosition(String id, String orgId, String profileType) {
        jdbc.update("INSERT INTO position(id,org_id,name,description,created_at,profile_type) VALUES (?,?,?,?,?,?)",
            id, orgId, "Teacher " + id, null, Timestamp.from(NOW), profileType);
    }

    private void insertMember(String userId, String orgId, String departmentId, String code,
                              String fullName, String teachingStatus) {
        jdbc.update("""
            INSERT INTO department_member(user_id,org_id,department_id,role,appointed_by,appointed_at,username)
            VALUES (?,?,?,'STAFF','owner',?,?)
            """, userId, orgId, departmentId, Timestamp.from(NOW), code.toLowerCase());
        jdbc.update("INSERT INTO member_position(user_id,position_id,org_id) VALUES (?,?,?)",
            userId, "pos-teacher", orgId);
        jdbc.update("""
            INSERT INTO staff_profile(user_id,org_id,staff_code,full_name,full_name_unaccented,
                                      phone,email,version,created_by,created_at)
            VALUES (?,?,?,?,?,NULL,NULL,0,'owner',?)
            """, userId, orgId, code, fullName,
            com.mems.service.TextNormalizer.unaccent(fullName), Timestamp.from(NOW));
        jdbc.update("""
            INSERT INTO teacher_profile(user_id,org_id,contract_type,teaching_status,version,created_by,created_at)
            VALUES (?,?,'CO_HUU',?,0,'owner',?)
            """, userId, orgId, teachingStatus, Timestamp.from(NOW));
    }

    private void insertSpecialty(String id, String name) {
        jdbc.update("""
            INSERT INTO specialty(id,org_id,name,name_unaccented,is_active,created_by,created_at)
            VALUES (?,?,?,?,TRUE,'owner',?)
            """, id, "org-1", name, com.mems.service.TextNormalizer.unaccent(name), Timestamp.from(NOW));
    }

    private void insertSubject(String id, String name) {
        jdbc.update("""
            INSERT INTO subject(id,org_id,name,name_unaccented,is_active,created_by,created_at)
            VALUES (?,?,?,?,TRUE,'owner',?)
            """, id, "org-1", name, com.mems.service.TextNormalizer.unaccent(name), Timestamp.from(NOW));
    }

    private void insertClass(String id, String code, String teacherId, String status, String subjectId) {
        jdbc.update("""
            INSERT INTO school_class(id,org_id,class_code,name,status,teacher_id,subject_id,close_state,created_by,created_at)
            VALUES (?,?,?,?,?,?,?,'NONE','owner',?)
            """, id, "org-1", code, "Class " + code, status, teacherId, subjectId, Timestamp.from(NOW));
    }
}
