package com.mems.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mems.dto.TeacherUpdateRequest;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.exception.SpecialtyMismatchException;
import com.mems.repository.MemberRepository;
import com.mems.repository.PositionRepository;
import com.mems.repository.SpecialtyRepository;
import com.mems.repository.StaffProfileRepository;
import com.mems.repository.TeacherRepository;
import com.mems.security.Actor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@JdbcTest
class TeacherServiceTest {
    private static final Instant NOW = Instant.parse("2026-11-06T00:00:00Z");

    @Autowired
    private JdbcTemplate jdbc;

    private Actor actor;
    private PeopleAuditService audit;
    private TeacherService service;

    @BeforeEach
    void setUp() {
        actor = mock(Actor.class);
        when(actor.orgId()).thenReturn("org-1");
        when(actor.userId()).thenReturn("actor-1");
        when(actor.owner()).thenReturn(true);
        audit = mock(PeopleAuditService.class);

        SpecialtyRepository specialtyRepository = new SpecialtyRepository(jdbc);
        MemberRepository memberRepository = mock(MemberRepository.class);
        when(memberRepository.positionIds("t001", false)).thenReturn(Set.of("pos-teacher"));

        service = new TeacherService(
            mock(MemberService.class),
            new TeacherRepository(jdbc, specialtyRepository, new ObjectMapper()),
            new StaffProfileRepository(jdbc),
            specialtyRepository,
            new SpecialtyService(specialtyRepository, actor),
            new PositionRepository(jdbc),
            memberRepository,
            audit,
            actor);

        seed();
    }

    @Test
    @DisplayName("AC-17.09 Đổi chuyên môn làm lớp lệch môn: 409 SPECIALTY_MISMATCH kèm tên lớp, chưa lưu")
    void specialtyChangeWarnsWhenClassSubjectNoLongerMatches() {
        TeacherUpdateRequest request = update("Nguyễn Văn An", "an@example.com", null,
            Set.of("sp-ly"), "CO_HUU", 0L, null);

        assertThatThrownBy(() -> service.update("t001", request))
            .isInstanceOf(SpecialtyMismatchException.class)
            .satisfies(ex -> assertThat(((SpecialtyMismatchException) ex).getClasses())
                .extracting(com.mems.dto.ClassMismatch::name)
                .containsExactly("Lớp 10A"));

        assertThat(jdbc.queryForObject("SELECT full_name FROM staff_profile WHERE user_id='t001'", String.class))
            .isEqualTo("Nguyễn Văn An");
        verify(audit, never()).record(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("AC-17.09 confirm=true lưu thay đổi chuyên môn, ghi lịch sử, không đổi lớp phụ trách")
    void confirmSavesSpecialtyChangeAndKeepsClasses() {
        TeacherUpdateRequest request = update("Nguyễn Văn An", "an@example.com", null,
            Set.of("sp-ly"), "THINH_GIANG", 0L, true);

        var result = service.update("t001", request);

        assertThat(result.specialties()).extracting(com.mems.dto.SpecialtyResponse::id).containsExactly("sp-ly");
        assertThat(result.contractType()).isEqualTo("THINH_GIANG");
        assertThat(result.classes()).extracting(com.mems.dto.TeacherClassResponse::classCode).containsExactly("C001");
        assertThat(jdbc.queryForObject("SELECT teacher_id FROM school_class WHERE id='c001'", String.class))
            .isEqualTo("t001");
        verify(audit).record(eq("org-1"), eq("actor-1"), eq("TEACHER_UPDATED"), eq("t001"), any());
    }

    @Test
    @DisplayName("AC-15.09 Cắt khoảng trắng và lưu email chữ thường; SĐT toàn khoảng trắng thành null")
    void trimsTextAndNormalizesEmail() {
        TeacherUpdateRequest request = update("  Nguyễn  Văn  An  ", " AN@Example.COM ",
            "   ", Set.of("sp-toan"), null, 0L, null);

        var result = service.update("t001", request);

        assertThat(result.fullName()).isEqualTo("Nguyễn  Văn  An");
        assertThat(result.email()).isEqualTo("an@example.com");
        assertThat(result.phone()).isNull();
        assertThat(result.contractType()).isNull();
    }

    @Test
    @DisplayName("AC-17.06 Email trùng giáo viên khác trong tổ chức bị từ chối")
    void rejectsEmailUsedByAnotherTeacher() {
        TeacherUpdateRequest request = update("Nguyễn Văn An", "binh@example.com", null,
            Set.of("sp-toan"), null, 0L, null);

        assertThatThrownBy(() -> service.update("t001", request))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertError((AppException) ex, HttpStatus.CONFLICT, "EMAIL_EXISTS"));
    }

    @Test
    @DisplayName("AC-17.07 Giữ nguyên email của chính mình thì không báo trùng")
    void allowsKeepingOwnEmail() {
        TeacherUpdateRequest request = update("Nguyễn Văn An", "AN@example.com", null,
            Set.of("sp-toan"), null, 0L, null);

        var result = service.update("t001", request);

        assertThat(result.email()).isEqualTo("an@example.com");
    }

    @Test
    @DisplayName("AC-17.10 Hai người cùng sửa: version cũ nhận 409 DATA_CHANGED")
    void staleVersionReturnsDataChanged() {
        TeacherUpdateRequest request = update("Nguyễn Văn An", "an@example.com", null,
            Set.of("sp-toan"), null, 7L, null);

        assertThatThrownBy(() -> service.update("t001", request))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertError((AppException) ex, HttpStatus.CONFLICT, "DATA_CHANGED"));
    }

    @Test
    @DisplayName("Cách ly tổ chức: giáo viên tổ chức khác trả 404")
    void rejectsTeacherFromAnotherOrganization() {
        TeacherUpdateRequest request = update("Nguyễn Văn An", "an@example.com", null,
            Set.of("sp-toan"), null, 0L, null);

        assertThatThrownBy(() -> service.update("other-teacher", request))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertError((AppException) ex, HttpStatus.NOT_FOUND, "TEACHER_NOT_FOUND"));
    }

    @Test
    @DisplayName("AC-15.11 Người dùng bị giới hạn phòng ban khác: 403")
    void rejectsActorOutsideTeacherDepartment() {
        doThrow(new AppException(ErrorCode.FORBIDDEN, "Department access denied"))
            .when(actor).requireDepartment("dept-1");
        TeacherUpdateRequest request = update("Nguyễn Văn An", "an@example.com", null,
            Set.of("sp-toan"), null, 0L, null);

        assertThatThrownBy(() -> service.update("t001", request))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertError((AppException) ex, HttpStatus.FORBIDDEN, "FORBIDDEN"));
    }

    private TeacherUpdateRequest update(String fullName, String email, String phone, Set<String> specialtyIds,
                                        String contractType, Long version, Boolean confirm) {
        return new TeacherUpdateRequest(fullName, email, phone, specialtyIds, contractType, version, confirm);
    }

    private void assertError(AppException ex, HttpStatus status, String code) {
        assertThat(ex.getStatus()).isEqualTo(status);
        assertThat(ex.getCode()).isEqualTo(code);
    }

    private void seed() {
        insertDepartment("dept-1", "org-1");
        insertMember("t001", "org-1", "dept-1");
        insertMember("t002", "org-1", "dept-1");
        insertStaff("t001", "org-1", "GV001", "Nguyễn Văn An", "an@example.com", 0);
        insertStaff("t002", "org-1", "GV002", "Trần Thị Bình", "binh@example.com", 0);
        insertTeacher("t001", "org-1", "CO_HUU");
        insertTeacher("t002", "org-1", "CO_HUU");
        insertSpecialty("sp-toan", "org-1", "Toán", "toan");
        insertSpecialty("sp-ly", "org-1", "Vật lý", "vat ly");
        linkSpecialty("t001", "sp-toan", "org-1");
        linkSpecialty("t002", "sp-toan", "org-1");
        insertSubject("sub-toan", "org-1", "Toán", "toan");
        insertClass("c001", "org-1", "C001", "Lớp 10A", "t001", "sub-toan");

        insertDepartment("dept-9", "org-2");
        insertMember("other-teacher", "org-2", "dept-9");
        insertStaff("other-teacher", "org-2", "GV900", "Người Tổ Chức Khác", "other@example.com", 0);
        insertTeacher("other-teacher", "org-2", "CO_HUU");
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

    private void insertStaff(String userId, String orgId, String code, String name, String email, long version) {
        jdbc.update("""
            INSERT INTO staff_profile(user_id, org_id, staff_code, full_name, full_name_unaccented, email, version, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, userId, orgId, code, name, name.toLowerCase(), email, version, Timestamp.from(NOW));
    }

    private void insertTeacher(String userId, String orgId, String contractType) {
        jdbc.update("""
            INSERT INTO teacher_profile(user_id, org_id, contract_type, teaching_status, version, created_at)
            VALUES (?, ?, ?, 'DANG_DAY', 0, ?)
            """, userId, orgId, contractType, Timestamp.from(NOW));
    }

    private void insertSpecialty(String id, String orgId, String name, String unaccented) {
        jdbc.update("""
            INSERT INTO specialty(id, org_id, name, name_unaccented, is_active, created_at)
            VALUES (?, ?, ?, ?, TRUE, ?)
            """, id, orgId, name, unaccented, Timestamp.from(NOW));
    }

    private void linkSpecialty(String userId, String specialtyId, String orgId) {
        jdbc.update("INSERT INTO teacher_specialty(user_id, specialty_id, org_id) VALUES (?, ?, ?)",
            userId, specialtyId, orgId);
    }

    private void insertSubject(String id, String orgId, String name, String unaccented) {
        jdbc.update("""
            INSERT INTO subject(id, org_id, name, name_unaccented, is_active, created_at)
            VALUES (?, ?, ?, ?, TRUE, ?)
            """, id, orgId, name, unaccented, Timestamp.from(NOW));
    }

    private void insertClass(String id, String orgId, String code, String name, String teacherId, String subjectId) {
        jdbc.update("""
            INSERT INTO school_class(id, org_id, class_code, name, status, teacher_id, subject_id,
                                    version, close_state, created_by, created_at)
            VALUES (?, ?, ?, ?, 'DANG_DIEN_RA', ?, ?, 0, 'NONE', 'owner-1', ?)
            """, id, orgId, code, name, teacherId, subjectId, Timestamp.from(NOW));
    }
}
