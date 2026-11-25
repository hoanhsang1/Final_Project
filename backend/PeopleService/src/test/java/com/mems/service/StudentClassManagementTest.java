package com.mems.service;

import com.mems.client.IdentityClient;
import com.mems.dto.*;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.outbox.OutboxEventRepository;
import com.mems.repository.AssignmentRepository;
import com.mems.repository.PositionRepository;
import com.mems.repository.SchoolClassRepository;
import com.mems.repository.StudentRepository;
import com.mems.repository.SubjectRepository;
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
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class StudentClassManagementTest {

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private SchoolClassRepository classRepository;

    @Mock
    private Actor actor;

    @Mock
    private IdentityClient identityClient;

    @Mock
    private PeopleAuditService audit;

    @Mock
    private JdbcTemplate jdbc;

    @Mock
    private TeacherRepository teacherRepository;

    @Mock
    private ClassStatusService classStatusService;

    @Mock
    private SubjectRepository subjectRepository;

    @Mock
    private OutboxEventRepository outbox;

    @Mock
    private AssignmentRepository assignmentRepository;

    @Mock
    private PositionRepository positionRepository;

    private OrganizationModuleGuard moduleGuard;
    private StudentService studentService;
    private SchoolClassService classService;
    private EffectivePermissionsService effectivePermissions;

    @BeforeEach
    void setUp() {
        moduleGuard = new OrganizationModuleGuard(identityClient);
        studentService = new StudentService(studentRepository, actor, moduleGuard, audit, identityClient);
        classService = new SchoolClassService(classRepository, studentRepository, actor, moduleGuard, audit,
            teacherRepository, classStatusService, subjectRepository, outbox, "TEACHER_ASSIGNMENT");
        effectivePermissions = new EffectivePermissionsService(jdbc, identityClient,
            assignmentRepository, positionRepository);
    }

    @Test
    @DisplayName("Tổ chức không có STUDENT_MANAGEMENT active: /students và /classes bị chặn, kể cả OWNER (400 MODULE_NOT_ENABLED)")
    void inactiveStudentManagementBlocksStudentsAndClasses() {
        when(actor.orgId()).thenReturn("org-unauthorized");
        when(identityClient.activeModules("org-unauthorized")).thenReturn(List.of()); // No STUDENT_MANAGEMENT

        assertThatThrownBy(() -> studentService.list(1, 20, null, null, null))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> {
                AppException apiEx = (AppException) ex;
                assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                assertThat(apiEx.getCode()).isEqualTo("MODULE_NOT_ENABLED");
            });

        assertThatThrownBy(() -> classService.list(1, 20, null, null, false))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> {
                AppException apiEx = (AppException) ex;
                assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                assertThat(apiEx.getCode()).isEqualTo("MODULE_NOT_ENABLED");
            });
    }

    @Test
    @DisplayName("Identity lỗi/timeout khi kiểm tra module: 503 IDENTITY_UNAVAILABLE")
    void identityUnavailableThrows503() {
        when(actor.orgId()).thenReturn("org-1");
        when(identityClient.moduleStatus("org-1"))
            .thenThrow(new AppException(ErrorCode.IDENTITY_UNAVAILABLE, "Identity service unavailable"));

        assertThatThrownBy(() -> studentService.list(1, 20, null, null, null))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> {
                AppException apiEx = (AppException) ex;
                assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                assertThat(apiEx.getCode()).isEqualTo("IDENTITY_UNAVAILABLE");
            });
    }

    @Test
    @DisplayName("Module disabled: reads still allowed, writes blocked (DEC-11 read-only)")
    void disabledModuleIsReadOnly() {
        when(actor.orgId()).thenReturn("org-1");
        when(identityClient.moduleStatus("org-1")).thenReturn(List.of(
            java.util.Map.of("code", "STUDENT_MANAGEMENT", "status", "disabled")));
        when(identityClient.activeModules("org-1")).thenReturn(List.of());
        when(studentRepository.list("org-1", 1, 20, null, null, null))
            .thenReturn(java.util.Map.of("items", List.of()));

        assertThat(studentService.list(1, 20, null, null, null)).isNotNull();

        StudentRequest request = new StudentRequest("STU001", "John", LocalDate.of(2000, 1, 1),
            null, null, "active");
        assertThatThrownBy(() -> studentService.create(request))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode())
                .isEqualTo("MODULE_NOT_ENABLED"));
    }

    @Test
    @DisplayName("STAFF thuộc phòng KHÔNG phụ trách STUDENT_MANAGEMENT có chức vụ chứa student.edit: quyền hiệu lực không có student.edit")
    void staffInDepartmentWithoutModuleLosesStudentEditPermission() {
        when(identityClient.permissions()).thenReturn(List.of(
            new PermissionResponse("employee.view", "View department members", null),
            new PermissionResponse("student.edit", "Edit students", "STUDENT_MANAGEMENT")
        ));
        // Department has no modules
        when(jdbc.queryForList(anyString(), eq(String.class), eq("dept-no-student"), eq("org-1")))
            .thenReturn(List.of());

        Set<String> effective = effectivePermissions.compute("org-1", "dept-no-student", Set.of("employee.view", "student.edit"));
        assertThat(effective).containsExactly("employee.view");
        assertThat(effective).doesNotContain("student.edit");
    }

    @Test
    @DisplayName("Gỡ module khỏi phòng, refresh: quyền sinh viên biến mất")
    void removingModuleFromDepartmentStripsStudentPermissionsOnRefresh() {
        when(identityClient.permissions()).thenReturn(List.of(
            new PermissionResponse("student.view", "View students", "STUDENT_MANAGEMENT"),
            new PermissionResponse("student.edit", "Edit students", "STUDENT_MANAGEMENT")
        ));

        // Before removal: department had STUDENT_MANAGEMENT
        when(jdbc.queryForList(anyString(), eq(String.class), eq("dept-1"), eq("org-1")))
            .thenReturn(List.of("STUDENT_MANAGEMENT"));
        Set<String> before = effectivePermissions.compute("org-1", "dept-1", Set.of("student.view", "student.edit"));
        assertThat(before).containsExactlyInAnyOrder("student.view", "student.edit");

        // After removal: department has no modules
        when(jdbc.queryForList(anyString(), eq(String.class), eq("dept-1"), eq("org-1")))
            .thenReturn(List.of());
        Set<String> after = effectivePermissions.compute("org-1", "dept-1", Set.of("student.view", "student.edit"));
        assertThat(after).isEmpty();
    }

    @Test
    @DisplayName("Người tổ chức A không đọc/sửa/xóa được sinh viên/lớp tổ chức B (404 STUDENT_NOT_FOUND / CLASS_NOT_FOUND)")
    void crossOrganizationAccessReturns404() {
        when(actor.orgId()).thenReturn("org-A");
        when(identityClient.activeModules("org-A")).thenReturn(List.of("STUDENT_MANAGEMENT"));
        when(identityClient.moduleStatus("org-A")).thenReturn(List.of(
            java.util.Map.of("code", "STUDENT_MANAGEMENT", "status", "active")));

        when(studentRepository.require("student-B", "org-A", false))
            .thenThrow(new AppException(ErrorCode.STUDENT_NOT_FOUND, "Student not found"));
        when(classRepository.require("class-B", "org-A", false))
            .thenThrow(new AppException(ErrorCode.CLASS_NOT_FOUND, "Class not found"));

        assertThatThrownBy(() -> studentService.get("student-B"))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("STUDENT_NOT_FOUND"));

        assertThatThrownBy(() -> classService.get("class-B"))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("CLASS_NOT_FOUND"));
    }

    @Test
    @DisplayName("Trùng student_code / class_code trong cùng tổ chức: 409 CONFLICT")
    void duplicateCodeInSameOrgThrows409() {
        when(actor.orgId()).thenReturn("org-1");
        when(identityClient.activeModules("org-1")).thenReturn(List.of("STUDENT_MANAGEMENT"));

        doThrow(new AppException(ErrorCode.CONFLICT, "Student code already exists in organization"))
            .when(studentRepository).checkStudentCodeAvailable("org-1", "STU001");

        doThrow(new AppException(ErrorCode.CONFLICT, "Class code already exists in organization"))
            .when(classRepository).checkClassCodeAvailable("org-1", "CLS001");

        StudentRequest stuReq = new StudentRequest("STU001", "John", LocalDate.of(2000, 1, 1), null, null, "active");
        SchoolClassRequest clsReq = new SchoolClassRequest("CLS001", "Class 1", "2026", null, null, "active");

        assertThatThrownBy(() -> studentService.create(stuReq))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT));

        assertThatThrownBy(() -> classService.create(clsReq))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    @DisplayName("Xóa lớp còn sinh viên: 409 CLASS_NOT_EMPTY")
    void deleteClassWithEnrolledStudentsThrows409() {
        when(actor.orgId()).thenReturn("org-1");
        when(identityClient.activeModules("org-1")).thenReturn(List.of("STUDENT_MANAGEMENT"));

        SchoolClassResponse classMock = new SchoolClassResponse(
            "class-1", "org-1", "CLS001", "Math 101", "2026", null, null, "CHUA_BAT_DAU",
            null, "NONE", 0, 5, "actor-1", Instant.now(), null
        );
        when(classRepository.require("class-1", "org-1", true)).thenReturn(classMock);
        doThrow(new AppException(ErrorCode.CLASS_NOT_EMPTY, "Cannot delete class with enrolled students"))
            .when(classRepository).delete("class-1", "org-1");

        assertThatThrownBy(() -> classService.delete("class-1"))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> {
                AppException apiEx = (AppException) ex;
                assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                assertThat(apiEx.getCode()).isEqualTo("CLASS_NOT_EMPTY");
            });
    }

    @Test
    @DisplayName("Thêm sinh viên vào lớp thứ hai khi đã ở một lớp khác: 409 STUDENT_ALREADY_IN_CLASS")
    void addStudentToSecondClassThrows409() {
        when(actor.orgId()).thenReturn("org-1");
        when(identityClient.activeModules("org-1")).thenReturn(List.of("STUDENT_MANAGEMENT"));

        SchoolClassResponse classMock = new SchoolClassResponse(
            "class-2", "org-1", "CLS002", "Physics 101", "2026", null, null, "CHUA_BAT_DAU",
            null, "NONE", 0, 0, "actor-1", Instant.now(), null
        );
        when(classRepository.require("class-2", "org-1", true)).thenReturn(classMock);
        when(studentRepository.require("student-1", "org-1", true)).thenReturn(null);

        doThrow(new AppException(ErrorCode.STUDENT_ALREADY_IN_CLASS, "Student is already enrolled in another class"))
            .when(classRepository).enrollStudent("class-2", "student-1", "org-1");

        assertThatThrownBy(() -> classService.addStudent("class-2", "student-1"))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> {
                AppException apiEx = (AppException) ex;
                assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                assertThat(apiEx.getCode()).isEqualTo("STUDENT_ALREADY_IN_CLASS");
            });
    }

    @Test
    @DisplayName("Xóa mềm sinh viên: xóa mềm và gỡ khỏi lớp")
    void softDeleteStudentRemovesFromClass() {
        when(actor.orgId()).thenReturn("org-1");
        when(actor.userId()).thenReturn("user-admin");
        when(identityClient.activeModules("org-1")).thenReturn(List.of("STUDENT_MANAGEMENT"));

        StudentResponse studentMock = new StudentResponse(
            "student-1", "org-1", "STU001", "Alice", LocalDate.of(2002, 5, 10),
            "alice@example.com", "0900000000", "active", "class-1", "CLS001", "Class 1",
            "user-admin", Instant.now(), null
        );
        when(studentRepository.require("student-1", "org-1", true)).thenReturn(studentMock);

        studentService.delete("student-1");

        verify(studentRepository).delete("student-1", "org-1");
        verify(audit).record(eq("org-1"), eq("user-admin"), eq("STUDENT_DELETED"), eq("student-1"), any());
    }

    @Test
    @DisplayName("STU-02: chuyển hồ sơ sang suspended → khóa tài khoản đăng nhập")
    void suspendingStudentDisablesLoginAccount() {
        when(actor.orgId()).thenReturn("org-1");
        when(actor.userId()).thenReturn("user-admin");
        when(identityClient.activeModules("org-1")).thenReturn(List.of("STUDENT_MANAGEMENT"));
        when(identityClient.moduleStatus("org-1")).thenReturn(List.of(
            java.util.Map.of("code", "STUDENT_MANAGEMENT", "status", "active")));
        StudentResponse before = student("student-1", "alice@example.com", Instant.now());
        when(studentRepository.require("student-1", "org-1", true)).thenReturn(before);
        StudentResponse after = new StudentResponse("student-1", "org-1", "STU001", "Alice",
            LocalDate.of(2002, 5, 10), "alice@example.com", null, "suspended", null, null, null,
            "user-admin", Instant.now(), null, "alice@example.com", before.accountCreatedAt());
        when(studentRepository.update(eq("student-1"), eq("org-1"), eq("Alice"), any(), any(), any(),
            eq("suspended"))).thenReturn(after);

        studentService.update("student-1", new StudentUpdateRequest("Alice", null,
            "alice@example.com", null, "suspended"));

        verify(identityClient).disableAccount("student-1", "org-1");
        verify(identityClient, never()).enableAccount(anyString(), anyString());
    }

    @Test
    @DisplayName("STU-02: mở lại hồ sơ active → mở tài khoản đăng nhập")
    void reactivatingStudentEnablesLoginAccount() {
        when(actor.orgId()).thenReturn("org-1");
        when(actor.userId()).thenReturn("user-admin");
        when(identityClient.activeModules("org-1")).thenReturn(List.of("STUDENT_MANAGEMENT"));
        when(identityClient.moduleStatus("org-1")).thenReturn(List.of(
            java.util.Map.of("code", "STUDENT_MANAGEMENT", "status", "active")));
        StudentResponse before = new StudentResponse("student-1", "org-1", "STU001", "Alice",
            LocalDate.of(2002, 5, 10), "alice@example.com", null, "suspended", null, null, null,
            "user-admin", Instant.now(), null, "alice@example.com", Instant.now());
        when(studentRepository.require("student-1", "org-1", true)).thenReturn(before);
        StudentResponse after = new StudentResponse("student-1", "org-1", "STU001", "Alice",
            LocalDate.of(2002, 5, 10), "alice@example.com", null, "active", null, null, null,
            "user-admin", Instant.now(), null, "alice@example.com", before.accountCreatedAt());
        when(studentRepository.update(eq("student-1"), eq("org-1"), eq("Alice"), any(), any(), any(),
            eq("active"))).thenReturn(after);

        studentService.update("student-1", new StudentUpdateRequest("Alice", null,
            "alice@example.com", null, "active"));

        verify(identityClient).enableAccount("student-1", "org-1");
        verify(identityClient, never()).disableAccount(anyString(), anyString());
    }

    @Test
    @DisplayName("STU-02: hồ sơ chưa có tài khoản → không gọi Identity khi đổi trạng thái")
    void statusUpdateWithoutAccountSkipsIdentity() {
        when(actor.orgId()).thenReturn("org-1");
        when(actor.userId()).thenReturn("user-admin");
        when(identityClient.activeModules("org-1")).thenReturn(List.of("STUDENT_MANAGEMENT"));
        when(identityClient.moduleStatus("org-1")).thenReturn(List.of(
            java.util.Map.of("code", "STUDENT_MANAGEMENT", "status", "active")));
        StudentResponse before = student("student-1", "alice@example.com", null);
        when(studentRepository.require("student-1", "org-1", true)).thenReturn(before);
        when(studentRepository.update(eq("student-1"), eq("org-1"), eq("Alice"), any(), any(), any(),
            eq("inactive"))).thenReturn(before);

        studentService.update("student-1", new StudentUpdateRequest("Alice", null,
            "alice@example.com", null, "inactive"));

        verify(identityClient, never()).disableAccount(anyString(), anyString());
        verify(identityClient, never()).enableAccount(anyString(), anyString());
    }

    @Test
    @DisplayName("STU-02: xóa sinh viên đã có tài khoản → khóa tài khoản trước khi xóa mềm")
    void deletingStudentDisablesLoginAccount() {
        when(actor.orgId()).thenReturn("org-1");
        when(actor.userId()).thenReturn("user-admin");
        when(identityClient.activeModules("org-1")).thenReturn(List.of("STUDENT_MANAGEMENT"));
        when(identityClient.moduleStatus("org-1")).thenReturn(List.of(
            java.util.Map.of("code", "STUDENT_MANAGEMENT", "status", "active")));
        when(studentRepository.require("student-1", "org-1", true)).thenReturn(
            student("student-1", "alice@example.com", Instant.now()));

        studentService.delete("student-1");

        verify(identityClient).disableAccount("student-1", "org-1");
        verify(studentRepository).delete("student-1", "org-1");
    }

    @Test
    @DisplayName("Quy tắc 12: cấp tài khoản dùng email làm username và lưu mốc tạo tài khoản")
    void createStudentAccountProvisionsIdentityAccount() {
        when(actor.orgId()).thenReturn("org-1");
        when(actor.userId()).thenReturn("user-admin");
        when(identityClient.activeModules("org-1")).thenReturn(List.of("STUDENT_MANAGEMENT"));
        when(studentRepository.require("student-1", "org-1", false)).thenReturn(
            student("student-1", "Alice@Example.com", null));

        var result = studentService.createAccount("student-1");

        assertThat(result.studentId()).isEqualTo("student-1");
        assertThat(result.username()).isEqualTo("alice@example.com");
        assertThat(result.temporaryPassword()).isNotBlank();
        verify(identityClient).createStudentAccount(eq("student-1"), eq("org-1"),
            eq("alice@example.com"), eq("alice@example.com"), anyString(), eq("user-admin"));
        verify(studentRepository).markAccountCreated("student-1", "org-1", "alice@example.com");
        verify(audit).record(eq("org-1"), eq("user-admin"), eq("STUDENT_ACCOUNT_CREATED"),
            eq("student-1"), any());
    }

    @Test
    @DisplayName("Quy tắc 12: hồ sơ đã có tài khoản → 409 STUDENT_ACCOUNT_EXISTS")
    void createStudentAccountRejectsDuplicate() {
        when(actor.orgId()).thenReturn("org-1");
        when(identityClient.activeModules("org-1")).thenReturn(List.of("STUDENT_MANAGEMENT"));
        when(studentRepository.require("student-1", "org-1", false)).thenReturn(
            new StudentResponse("student-1", "org-1", "STU001", "Alice", null,
                "alice@example.com", null, "active", null, null, null, "user-admin",
                Instant.now(), null, "alice@example.com", Instant.now()));

        assertThatThrownBy(() -> studentService.createAccount("student-1"))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("STUDENT_ACCOUNT_EXISTS"));
        verify(identityClient, never()).createStudentAccount(anyString(), anyString(), anyString(),
            anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("Quy tắc 12: thiếu email → 400 STUDENT_EMAIL_REQUIRED")
    void createStudentAccountRequiresEmail() {
        when(actor.orgId()).thenReturn("org-1");
        when(identityClient.activeModules("org-1")).thenReturn(List.of("STUDENT_MANAGEMENT"));
        when(studentRepository.require("student-1", "org-1", false)).thenReturn(
            student("student-1", null, null));

        assertThatThrownBy(() -> studentService.createAccount("student-1"))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("STUDENT_EMAIL_REQUIRED"));
    }

    private StudentResponse student(String id, String email, Instant accountCreatedAt) {
        return new StudentResponse(id, "org-1", "STU001", "Alice", LocalDate.of(2002, 5, 10),
            email, null, "active", null, null, null, "user-admin", Instant.now(), null,
            null, accountCreatedAt);
    }
}
