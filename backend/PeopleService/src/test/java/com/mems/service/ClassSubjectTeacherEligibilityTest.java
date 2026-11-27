package com.mems.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mems.dto.ClassSubjectCreateRequest;
import com.mems.dto.ClassSubjectUpdateRequest;
import com.mems.exception.AppException;
import com.mems.repository.ClassSubjectRepository;
import com.mems.repository.CurriculumRepository;
import com.mems.repository.SchoolClassRepository;
import com.mems.repository.SpecialtyRepository;
import com.mems.repository.SubjectRepository;
import com.mems.repository.TeacherRepository;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Gán giáo viên vào class_subject phải tuân quy tắc D1. */
@JdbcTest
class ClassSubjectTeacherEligibilityTest {
    private static final String ORG = "org-cs";
    private static final Instant NOW = Instant.parse("2026-11-26T00:00:00Z");

    @Autowired
    private JdbcTemplate jdbc;

    private ClassSubjectService service;

    @BeforeEach
    void setUp() {
        Actor actor = mock(Actor.class);
        when(actor.orgId()).thenReturn(ORG);
        when(actor.userId()).thenReturn("actor-cs");

        service = new ClassSubjectService(
            new ClassSubjectRepository(jdbc),
            new SchoolClassRepository(jdbc),
            new SubjectRepository(jdbc),
            new CurriculumRepository(jdbc),
            new TeacherRepository(jdbc, new SpecialtyRepository(jdbc), new ObjectMapper()),
            actor, mock(OrganizationModuleGuard.class), mock(PeopleAuditService.class));
        seed();
    }

    @Test
    @DisplayName("Chặn gán giáo viên khác danh mục vào môn của lớp (SUBJECT_MISMATCH)")
    void rejectsTeacherFromDifferentCategory() {
        assertThatThrownBy(() -> service.addSubject("class-cs",
            new ClassSubjectCreateRequest("sub-java", 30, 45, null, null, "t-eng")))
            .isInstanceOf(AppException.class)
            .extracting(ex -> ((AppException) ex).getCode()).isEqualTo("SUBJECT_MISMATCH");
        assertThat(countSubjects()).isZero();
    }

    @Test
    @DisplayName("Chặn gán giáo viên đã nghỉ việc dù chuyên môn trùng danh mục")
    void rejectsResignedTeacher() {
        assertThatThrownBy(() -> service.addSubject("class-cs",
            new ClassSubjectCreateRequest("sub-java", 30, 45, null, null, "t-resigned")))
            .isInstanceOf(AppException.class)
            .extracting(ex -> ((AppException) ex).getCode()).isEqualTo("SUBJECT_MISMATCH");
        assertThat(countSubjects()).isZero();
    }

    @Test
    @DisplayName("Cho phép gán giáo viên cùng danh mục")
    void acceptsEligibleTeacher() {
        var created = service.addSubject("class-cs",
            new ClassSubjectCreateRequest("sub-java", 30, 45, null, null, "t-web"));

        assertThat(created.teacherId()).isEqualTo("t-web");
        assertThat(jdbc.queryForObject(
            "SELECT teacher_id FROM class_subject WHERE class_id='class-cs' AND subject_id='sub-java'",
            String.class)).isEqualTo("t-web");
    }

    @Test
    @DisplayName("Cho phép bỏ gán giáo viên (teacherId null) khi cập nhật")
    void updateAllowsClearingTeacher() {
        service.addSubject("class-cs",
            new ClassSubjectCreateRequest("sub-java", 30, 45, null, null, "t-web"));

        var updated = service.updateSubject("class-cs", "sub-java",
            new ClassSubjectUpdateRequest(null, null, null, null, null, 0));

        assertThat(updated.teacherId()).isNull();
    }

    @Test
    @DisplayName("Cập nhật sang giáo viên không đủ điều kiện bị chặn, giáo viên cũ giữ nguyên")
    void updateRejectsIneligibleTeacher() {
        service.addSubject("class-cs",
            new ClassSubjectCreateRequest("sub-java", 30, 45, null, null, "t-web"));

        assertThatThrownBy(() -> service.updateSubject("class-cs", "sub-java",
            new ClassSubjectUpdateRequest(null, null, null, null, "t-eng", 0)))
            .isInstanceOf(AppException.class)
            .extracting(ex -> ((AppException) ex).getCode()).isEqualTo("SUBJECT_MISMATCH");
        assertThat(jdbc.queryForObject(
            "SELECT teacher_id FROM class_subject WHERE class_id='class-cs' AND subject_id='sub-java'",
            String.class)).isEqualTo("t-web");
    }

    private int countSubjects() {
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM class_subject WHERE class_id='class-cs'", Integer.class);
        return count == null ? 0 : count;
    }

    private void seed() {
        jdbc.update("INSERT INTO department(id,org_id,name,description,created_at) VALUES (?,?,?,?,?)",
            "dept-cs", ORG, "Dept cs", null, Timestamp.from(NOW));
        jdbc.update("INSERT INTO position(id,org_id,name,description,created_at,profile_type) "
            + "VALUES (?,?,?,?,?,?)", "pos-cs", ORG, "Teacher cs", null, Timestamp.from(NOW), "TEACHER");

        jdbc.update("""
            INSERT INTO subject_category(id,org_id,name,name_unaccented,is_active,created_by,created_at)
            VALUES ('cat-prog',?,'Lập trình','Lap trinh',TRUE,'owner',?)
            """, ORG, Timestamp.from(NOW));
        jdbc.update("""
            INSERT INTO subject_category(id,org_id,name,name_unaccented,is_active,created_by,created_at)
            VALUES ('cat-lang',?,'Ngoại ngữ','Ngoai ngu',TRUE,'owner',?)
            """, ORG, Timestamp.from(NOW));
        jdbc.update("""
            INSERT INTO specialty(id,org_id,name,name_unaccented,category_id,is_active,created_by,created_at)
            VALUES ('sp-web',?,'Lập trình Web','Lap trinh Web','cat-prog',TRUE,'owner',?)
            """, ORG, Timestamp.from(NOW));
        jdbc.update("""
            INSERT INTO specialty(id,org_id,name,name_unaccented,category_id,is_active,created_by,created_at)
            VALUES ('sp-eng',?,'Tiếng Anh','Tieng Anh','cat-lang',TRUE,'owner',?)
            """, ORG, Timestamp.from(NOW));

        insertTeacher("t-web", "GVW", "Web", "DANG_DAY", "sp-web");
        insertTeacher("t-eng", "GVE", "English", "DANG_DAY", "sp-eng");
        insertTeacher("t-resigned", "GVR", "Resigned", "NGHI_VIEC", "sp-web");

        jdbc.update("""
            INSERT INTO subject(id,org_id,name,name_unaccented,category_id,room_requirement,is_active,created_by,created_at)
            VALUES ('sub-java',?,'Java','Java','cat-prog','ANY',TRUE,'owner',?)
            """, ORG, Timestamp.from(NOW));
        jdbc.update("""
            INSERT INTO school_class(id,org_id,class_code,name,status,close_state,version,created_by,created_at)
            VALUES ('class-cs',?,'C-CS','Lớp CS','CHUA_BAT_DAU','NONE',0,'owner',?)
            """, ORG, Timestamp.from(NOW));
    }

    private void insertTeacher(String userId, String code, String name, String status, String specialtyId) {
        jdbc.update("""
            INSERT INTO department_member(user_id,org_id,department_id,role,appointed_by,appointed_at,username)
            VALUES (?,?,?,'STAFF','owner',?,?)
            """, userId, ORG, "dept-cs", Timestamp.from(NOW), code.toLowerCase());
        jdbc.update("INSERT INTO member_position(user_id,position_id,org_id) VALUES (?,?,?)",
            userId, "pos-cs", ORG);
        jdbc.update("""
            INSERT INTO staff_profile(user_id,org_id,staff_code,full_name,full_name_unaccented,
                                      phone,email,version,created_by,created_at)
            VALUES (?,?,?,?,?,NULL,NULL,0,'owner',?)
            """, userId, ORG, code, name, name, Timestamp.from(NOW));
        jdbc.update("""
            INSERT INTO teacher_profile(user_id,org_id,contract_type,teaching_status,version,created_by,created_at)
            VALUES (?,?,'CO_HUU',?,0,'owner',?)
            """, userId, ORG, status, Timestamp.from(NOW));
        jdbc.update("INSERT INTO teacher_specialty(user_id,specialty_id,org_id) VALUES (?,?,?)",
            userId, specialtyId, ORG);
    }
}
