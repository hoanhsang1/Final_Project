package com.mems.repository;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mems.dto.ClassMismatch;
import com.mems.dto.EligibleTeacherInfo;
import com.mems.dto.TeacherSubjectResponse;
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

/**
 * Quy tắc D1: đủ điều kiện khi chuyên môn cùng danh mục môn học hoặc có ngoại lệ APPROVED,
 * và giáo viên đang ở trạng thái DANG_DAY.
 */
@JdbcTest
class TeacherEligibilityTest {
    private static final String ORG = "org-elig";
    private static final Instant NOW = Instant.parse("2026-11-26T00:00:00Z");

    @Autowired
    private JdbcTemplate jdbc;

    private TeacherRepository teachers;

    @BeforeEach
    void setUp() {
        teachers = new TeacherRepository(jdbc, new SpecialtyRepository(jdbc), new ObjectMapper());
        seed();
    }

    @Test
    @DisplayName("D1.1 chuyên môn cùng danh mục → đủ điều kiện, lý do CATEGORY")
    void sameCategoryIsEligible() {
        assertThat(teachers.teachesSubject("t-web", ORG, "sub-java")).isTrue();
        assertThat(teachers.eligibleForSubject(ORG, "sub-java"))
            .extracting(EligibleTeacherInfo::userId).contains("t-web");
        assertThat(teachers.teachableSubjects("t-web", ORG))
            .extracting(TeacherSubjectResponse::subjectId, TeacherSubjectResponse::reason)
            .contains(org.assertj.core.groups.Tuple.tuple("sub-java", "CATEGORY"),
                org.assertj.core.groups.Tuple.tuple("sub-python", "CATEGORY"));
    }

    @Test
    @DisplayName("D1.2 chuyên môn khác danh mục và không có ngoại lệ → không đủ điều kiện")
    void differentCategoryWithoutExceptionIsRejected() {
        assertThat(teachers.teachesSubject("t-web", ORG, "sub-english")).isFalse();
        assertThat(teachers.eligibleForSubject(ORG, "sub-english"))
            .extracting(EligibleTeacherInfo::userId).doesNotContain("t-web");
        assertThat(teachers.teachableSubjects("t-web", ORG))
            .extracting(TeacherSubjectResponse::subjectId).doesNotContain("sub-english");
    }

    @Test
    @DisplayName("D1.3 khác danh mục nhưng có teacher_subject APPROVED → đủ điều kiện, lý do EXCEPTION")
    void approvedExceptionGrantsEligibility() {
        assertThat(teachers.teachesSubject("t-eng", ORG, "sub-java")).isTrue();
        assertThat(teachers.eligibleForSubject(ORG, "sub-java"))
            .extracting(EligibleTeacherInfo::userId).contains("t-eng");
        assertThat(teachers.teachableSubjects("t-eng", ORG))
            .extracting(TeacherSubjectResponse::subjectId, TeacherSubjectResponse::reason)
            .contains(org.assertj.core.groups.Tuple.tuple("sub-java", "EXCEPTION"),
                org.assertj.core.groups.Tuple.tuple("sub-english", "CATEGORY"));
    }

    @Test
    @DisplayName("D1.3b ngoại lệ REVOKED không cấp quyền dạy")
    void revokedExceptionDoesNotGrantEligibility() {
        assertThat(teachers.teachesSubject("t-revoked", ORG, "sub-java")).isFalse();
    }

    @Test
    @DisplayName("D1.4 giáo viên NGHI_VIEC không đủ điều kiện dù chuyên môn trùng danh mục")
    void resignedTeacherIsNotEligible() {
        assertThat(teachers.teachesSubject("t-resigned", ORG, "sub-java")).isFalse();
        assertThat(teachers.eligibleForSubject(ORG, "sub-java"))
            .extracting(EligibleTeacherInfo::userId).doesNotContain("t-resigned");
        assertThat(teachers.teachableSubjects("t-resigned", ORG)).isEmpty();
    }

    @Test
    @DisplayName("D1.5 môn không có danh mục chỉ nhận ngoại lệ; chuyên môn không áp dụng")
    void subjectWithoutCategoryNeedsException() {
        assertThat(teachers.teachesSubject("t-web", ORG, "sub-history")).isFalse();
        assertThat(teachers.teachesSubject("t-eng", ORG, "sub-history")).isTrue();
    }

    @Test
    @DisplayName("D1.6 teachesSubject, eligibleForSubject và subjectMismatch cho cùng kết quả")
    void allConsumersAgree() {
        List<String> subjects = List.of("sub-java", "sub-python", "sub-sql", "sub-english", "sub-history");
        for (String subjectId : subjects) {
            boolean teaches = teachers.teachesSubject("t-web", ORG, subjectId);
            boolean listed = teachers.eligibleForSubject(ORG, subjectId).stream()
                .anyMatch(t -> t.userId().equals("t-web"));
            assertThat(listed).as("eligibleForSubject vs teachesSubject cho " + subjectId)
                .isEqualTo(teaches);
        }

        List<String> mismatchedClasses = teachers.subjectMismatch("t-web", ORG, List.of("sp-web")).stream()
            .map(ClassMismatch::id).toList();
        // homeroom: java (cùng danh mục) và lớp đã kết thúc bị bỏ qua; english + history lệch.
        // dạy môn: sql cùng danh mục bị bỏ qua; english lệch.
        assertThat(mismatchedClasses)
            .containsExactlyInAnyOrder("c-english", "c-history", "c-teach-english");
    }

    @Test
    @DisplayName("D1.7 batch trả đủ key cho nhiều môn trong một lần gọi")
    void batchReturnsAllRequestedSubjects() {
        Map<String, List<EligibleTeacherInfo>> batch = teachers.eligibleForSubjectBatch(
            ORG, List.of("sub-java", "sub-english", "sub-history"));

        assertThat(batch).containsOnlyKeys("sub-java", "sub-english", "sub-history");
        assertThat(batch.get("sub-java")).extracting(EligibleTeacherInfo::userId)
            .containsExactlyInAnyOrder("t-web", "t-eng", "t-other");
        assertThat(batch.get("sub-english")).extracting(EligibleTeacherInfo::userId)
            .containsExactly("t-eng");
        assertThat(batch.get("sub-history")).extracting(EligibleTeacherInfo::userId)
            .containsExactly("t-eng");
    }

    @Test
    @DisplayName("D1.8 ngoại lệ ghi bởi API thay thế được đúng dòng MANUAL và giữ dòng SPECIALTY")
    void replaceExceptionsKeepsSpecialtyRows() {
        jdbc.update("""
            INSERT INTO teacher_subject(teacher_id,user_id,subject_id,org_id,status,source,created_at)
            VALUES ('t-web','t-web','sub-python','org-elig','APPROVED','SPECIALTY',?)
            """, Timestamp.from(NOW));

        teachers.replaceSubjectExceptions("t-web", ORG, List.of("sub-english", "sub-history"), "actor-1");

        assertThat(teachers.teachesSubject("t-web", ORG, "sub-english")).isTrue();
        assertThat(teachers.teachesSubject("t-web", ORG, "sub-history")).isTrue();
        assertThat(jdbc.queryForObject("""
            SELECT COUNT(*) FROM teacher_subject
            WHERE user_id='t-web' AND source='SPECIALTY' AND subject_id='sub-python'
            """, Integer.class)).isEqualTo(1);

        teachers.replaceSubjectExceptions("t-web", ORG, List.of(), "actor-1");
        assertThat(teachers.teachesSubject("t-web", ORG, "sub-english")).isFalse();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM teacher_subject WHERE user_id='t-web'",
            Integer.class)).isEqualTo(1);
    }

    private void seed() {
        jdbc.update("INSERT INTO department(id,org_id,name,description,created_at) VALUES (?,?,?,?,?)",
            "dept-elig", ORG, "Dept elig", null, Timestamp.from(NOW));
        jdbc.update("INSERT INTO position(id,org_id,name,description,created_at,profile_type) "
            + "VALUES (?,?,?,?,?,?)", "pos-elig", ORG, "Teacher elig", null, Timestamp.from(NOW),
            "TEACHER");
        insertMember("t-web", "GVWEB", "Lập trình viên", "DANG_DAY");
        insertMember("t-eng", "GVENG", "Giáo viên Anh", "DANG_DAY");
        insertMember("t-resigned", "GVRES", "Giáo viên nghỉ", "NGHI_VIEC");
        insertMember("t-revoked", "GVREV", "Giáo viên thu hồi", "DANG_DAY");
        insertMember("t-other", "GVOTH", "Giáo viên khác", "DANG_DAY");

        insertCategory("cat-prog", "Lập trình");
        insertCategory("cat-lang", "Ngoại ngữ");
        insertSubject("sub-java", "Java", "cat-prog");
        insertSubject("sub-python", "Python", "cat-prog");
        insertSubject("sub-sql", "SQL", "cat-prog");
        insertSubject("sub-english", "Tiếng Anh", "cat-lang");
        insertSubject("sub-history", "Lịch sử", null);

        insertSpecialty("sp-web", "Lập trình Web", "cat-prog");
        insertSpecialty("sp-eng", "Tiếng Anh", "cat-lang");
        jdbc.update("INSERT INTO teacher_specialty(user_id,specialty_id,org_id) VALUES (?,?,?)",
            "t-web", "sp-web", ORG);
        jdbc.update("INSERT INTO teacher_specialty(user_id,specialty_id,org_id) VALUES (?,?,?)",
            "t-eng", "sp-eng", ORG);
        jdbc.update("INSERT INTO teacher_specialty(user_id,specialty_id,org_id) VALUES (?,?,?)",
            "t-resigned", "sp-web", ORG);
        jdbc.update("INSERT INTO teacher_specialty(user_id,specialty_id,org_id) VALUES (?,?,?)",
            "t-other", "sp-web", ORG);

        insertException("t-eng", "sub-java", "APPROVED");
        insertException("t-eng", "sub-history", "APPROVED");
        insertException("t-revoked", "sub-java", "REVOKED");

        insertClass("c-java", "CJAVA", "t-web", "DANG_DIEN_RA", "sub-java");
        insertClass("c-english", "CENG", "t-web", "CHUA_BAT_DAU", "sub-english");
        insertClass("c-history", "CHIS", "t-web", "CHUA_BAT_DAU", "sub-history");
        insertClass("c-finished", "CFIN", "t-web", "DA_KET_THUC", "sub-english");
        insertClass("c-teach-sql", "CTSQL", "t-other", "CHUA_BAT_DAU", "sub-java");
        insertClass("c-teach-english", "CTENG", "t-other", "CHUA_BAT_DAU", "sub-java");

        insertClassSubject("c-teach-sql", "sub-sql", "t-web");
        insertClassSubject("c-teach-english", "sub-english", "t-web");
        insertClassSubject("c-finished", "sub-english", "t-web");
    }

    private void insertMember(String userId, String code, String fullName, String teachingStatus) {
        jdbc.update("""
            INSERT INTO department_member(user_id,org_id,department_id,role,appointed_by,appointed_at,username)
            VALUES (?,?,?,'STAFF','owner',?,?)
            """, userId, ORG, "dept-elig", Timestamp.from(NOW), code.toLowerCase());
        jdbc.update("INSERT INTO member_position(user_id,position_id,org_id) VALUES (?,?,?)",
            userId, "pos-elig", ORG);
        jdbc.update("""
            INSERT INTO staff_profile(user_id,org_id,staff_code,full_name,full_name_unaccented,
                                      phone,email,version,created_by,created_at)
            VALUES (?,?,?,?,?,NULL,NULL,0,'owner',?)
            """, userId, ORG, code, fullName, fullName, Timestamp.from(NOW));
        jdbc.update("""
            INSERT INTO teacher_profile(user_id,org_id,contract_type,teaching_status,version,created_by,created_at)
            VALUES (?,?,'CO_HUU',?,0,'owner',?)
            """, userId, ORG, teachingStatus, Timestamp.from(NOW));
    }

    private void insertCategory(String id, String name) {
        jdbc.update("""
            INSERT INTO subject_category(id,org_id,name,name_unaccented,is_active,created_by,created_at)
            VALUES (?,?,?,?,TRUE,'owner',?)
            """, id, ORG, name, name, Timestamp.from(NOW));
    }

    private void insertSubject(String id, String name, String categoryId) {
        jdbc.update("""
            INSERT INTO subject(id,org_id,name,name_unaccented,category_id,room_requirement,is_active,created_by,created_at)
            VALUES (?,?,?,?,?,'ANY',TRUE,'owner',?)
            """, id, ORG, name, name, categoryId, Timestamp.from(NOW));
    }

    private void insertSpecialty(String id, String name, String categoryId) {
        jdbc.update("""
            INSERT INTO specialty(id,org_id,name,name_unaccented,category_id,is_active,created_by,created_at)
            VALUES (?,?,?,?,?,TRUE,'owner',?)
            """, id, ORG, name, name, categoryId, Timestamp.from(NOW));
    }

    private void insertException(String userId, String subjectId, String status) {
        jdbc.update("""
            INSERT INTO teacher_subject(teacher_id,user_id,subject_id,org_id,status,source,created_at)
            VALUES (?,?,?,?,?,'MANUAL',?)
            """, userId, userId, subjectId, ORG, status, Timestamp.from(NOW));
    }

    private void insertClass(String id, String code, String teacherId, String status, String subjectId) {
        jdbc.update("""
            INSERT INTO school_class(id,org_id,class_code,name,status,teacher_id,subject_id,close_state,created_by,created_at)
            VALUES (?,?,?,?,?,?,?,'NONE','owner',?)
            """, id, ORG, code, "Class " + code, status, teacherId, subjectId, Timestamp.from(NOW));
    }

    private void insertClassSubject(String classId, String subjectId, String teacherId) {
        jdbc.update("""
            INSERT INTO class_subject(class_id,subject_id,org_id,source,teacher_id,is_primary,status,created_at)
            VALUES (?,?,?,'MANUAL',?,FALSE,'PLANNED',?)
            """, classId, subjectId, ORG, teacherId, Timestamp.from(NOW));
    }
}
