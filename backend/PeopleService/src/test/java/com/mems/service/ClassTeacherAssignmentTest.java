package com.mems.service;

import com.mems.client.IdentityClient;
import com.mems.dto.ClassTeacherAssignRequest;
import com.mems.dto.ClassTeacherInfo;
import com.mems.dto.SchoolClassResponse;
import com.mems.exception.ApiException;
import com.mems.repository.SchoolClassRepository;
import com.mems.repository.StudentRepository;
import com.mems.repository.TeacherRepository;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ClassTeacherAssignmentTest {

    @Mock private SchoolClassRepository classes;
    @Mock private StudentRepository students;
    @Mock private TeacherRepository teachers;
    @Mock private Actor actor;
    @Mock private IdentityClient identityClient;
    @Mock private PeopleAuditService audit;
    @Mock private ClassStatusService classStatusService;

    private SchoolClassService service;

    @BeforeEach
    void setUp() {
        service = new SchoolClassService(classes, students, actor,
            new OrganizationModuleGuard(identityClient), audit, teachers, classStatusService, "TEACHER_ASSIGNMENT");
        when(actor.orgId()).thenReturn("org-1");
        when(actor.userId()).thenReturn("actor-1");
        when(identityClient.activeModules("org-1")).thenReturn(List.of("STUDENT_MANAGEMENT"));
    }

    @Test
    @DisplayName("AC-18.01 Gán giáo viên DANG_DAY cho lớp đang mở: lưu và trả thông tin giáo viên")
    void assignsActiveTeacher() {
        var before = classRow("class-1", "CHUA_BAT_DAU", "NONE", null, 0);
        var after = classRow("class-1", "CHUA_BAT_DAU", "NONE",
            new ClassTeacherInfo("teacher-1", "GV001", "Nguyễn Văn An"), 1);
        when(classes.require("class-1", "org-1", true)).thenReturn(before);
        when(classes.require("class-1", "org-1", false)).thenReturn(after);
        when(teachers.requireTeacher("teacher-1", "org-1", false)).thenReturn(teacher("teacher-1", "DANG_DAY"));
        when(teachers.hasTeacherPosition("teacher-1", "org-1")).thenReturn(true);
        when(classes.assignTeacher("class-1", "org-1", "teacher-1", 0)).thenReturn(1);

        var result = service.assignTeacher("class-1", new ClassTeacherAssignRequest("teacher-1", 0L));

        assertThat(result.teacher()).isEqualTo(new ClassTeacherInfo("teacher-1", "GV001", "Nguyễn Văn An"));
        verify(audit).record(eq("org-1"), eq("actor-1"), eq("CLASS_TEACHER_ASSIGNED"), eq("class-1"), any());
    }

    @Test
    @DisplayName("AC-18.02 Giáo viên TAM_NGHI bị từ chối khi gọi trực tiếp")
    void rejectsNonTeachingTeacher() {
        when(classes.require("class-1", "org-1", true)).thenReturn(classRow("class-1", "CHUA_BAT_DAU", "NONE", null, 0));
        when(teachers.requireTeacher("teacher-1", "org-1", false)).thenReturn(teacher("teacher-1", "TAM_NGHI"));

        assertThatThrownBy(() -> service.assignTeacher("class-1", new ClassTeacherAssignRequest("teacher-1", 0L)))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> assertError((ApiException) ex, HttpStatus.CONFLICT, "TEACHER_NOT_AVAILABLE"));
        verify(classes, never()).assignTeacher(anyString(), anyString(), anyString(), anyLong());
    }

    @Test
    @DisplayName("AC-18.05 Module Phân công giáo viên bật: chặn gán trực tiếp kèm hướng dẫn")
    void rejectsWhenAssignmentModuleIsActive() {
        when(identityClient.activeModules("org-1"))
            .thenReturn(List.of("STUDENT_MANAGEMENT", "TEACHER_ASSIGNMENT"));
        when(classes.require("class-1", "org-1", true)).thenReturn(classRow("class-1", "DANG_DIEN_RA", "NONE", null, 0));
        when(teachers.requireTeacher("teacher-1", "org-1", false)).thenReturn(teacher("teacher-1", "DANG_DAY"));
        when(teachers.hasTeacherPosition("teacher-1", "org-1")).thenReturn(true);

        assertThatThrownBy(() -> service.assignTeacher("class-1", new ClassTeacherAssignRequest("teacher-1", 0L)))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> assertError((ApiException) ex, HttpStatus.CONFLICT,
                "TEACHER_ASSIGNMENT_MODULE_ACTIVE"));
    }

    @Test
    @DisplayName("AC-18.07 Lớp đã kết thúc, đã hủy hoặc đã đóng không gán được")
    void rejectsFinishedCancelledOrClosedClass() {
        when(classes.require("class-1", "org-1", true)).thenReturn(classRow("class-1", "DA_KET_THUC", "NONE", null, 0));
        assertThatThrownBy(() -> service.assignTeacher("class-1", new ClassTeacherAssignRequest("teacher-1", 0L)))
            .satisfies(ex -> assertError((ApiException) ex, HttpStatus.CONFLICT, "CLASS_NOT_ASSIGNABLE"));

        when(classes.require("class-2", "org-1", true)).thenReturn(classRow("class-2", "DA_HUY", "NONE", null, 0));
        assertThatThrownBy(() -> service.assignTeacher("class-2", new ClassTeacherAssignRequest("teacher-1", 0L)))
            .satisfies(ex -> assertError((ApiException) ex, HttpStatus.CONFLICT, "CLASS_NOT_ASSIGNABLE"));

        when(classes.require("class-3", "org-1", true)).thenReturn(classRow("class-3", "DANG_DIEN_RA", "CLOSED", null, 0));
        assertThatThrownBy(() -> service.assignTeacher("class-3", new ClassTeacherAssignRequest("teacher-1", 0L)))
            .satisfies(ex -> assertError((ApiException) ex, HttpStatus.CONFLICT, "CLASS_NOT_ASSIGNABLE"));
    }

    @Test
    @DisplayName("Sai version (dữ liệu lớp đã đổi): 409 DATA_CHANGED")
    void rejectsStaleVersion() {
        when(classes.require("class-1", "org-1", true)).thenReturn(classRow("class-1", "CHUA_BAT_DAU", "NONE", null, 2));
        when(teachers.requireTeacher("teacher-1", "org-1", false)).thenReturn(teacher("teacher-1", "DANG_DAY"));
        when(teachers.hasTeacherPosition("teacher-1", "org-1")).thenReturn(true);
        when(classes.assignTeacher("class-1", "org-1", "teacher-1", 1)).thenReturn(0);

        assertThatThrownBy(() -> service.assignTeacher("class-1", new ClassTeacherAssignRequest("teacher-1", 1L)))
            .satisfies(ex -> assertError((ApiException) ex, HttpStatus.CONFLICT, "DATA_CHANGED"));
    }

    private void assertError(ApiException ex, HttpStatus status, String code) {
        assertThat(ex.getStatus()).isEqualTo(status);
        assertThat(ex.getCode()).isEqualTo(code);
    }

    private SchoolClassResponse classRow(String id, String status, String closeState,
                                         ClassTeacherInfo teacher, long version) {
        return new SchoolClassResponse(id, "org-1", "C001", "Class 1", "2026", null, null, status,
            teacher, closeState, version, 0, "owner", Instant.now(), null);
    }

    private TeacherRepository.TeacherRow teacher(String id, String teachingStatus) {
        return new TeacherRepository.TeacherRow(id, "org-1", "GV001", "Nguyễn Văn An",
            "an@example.com", "0900000000", "dept-1", "STAFF", "CO_HUU", teachingStatus,
            0, Instant.now(), null);
    }
}
