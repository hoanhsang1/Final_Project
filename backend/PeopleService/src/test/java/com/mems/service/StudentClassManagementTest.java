package com.mems.service;

import com.mems.client.IdentityClient;
import com.mems.dto.*;
import com.mems.exception.ApiException;
import com.mems.repository.SchoolClassRepository;
import com.mems.repository.StudentRepository;
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

    private OrganizationModuleGuard moduleGuard;
    private StudentService studentService;
    private SchoolClassService classService;
    private EffectivePermissionsService effectivePermissions;

    @BeforeEach
    void setUp() {
        moduleGuard = new OrganizationModuleGuard(identityClient);
        studentService = new StudentService(studentRepository, actor, moduleGuard, audit);
        classService = new SchoolClassService(classRepository, studentRepository, actor, moduleGuard, audit);
        effectivePermissions = new EffectivePermissionsService(jdbc, identityClient);
    }

    @Test
    @DisplayName("Tổ chức không có STUDENT_MANAGEMENT active: /students và /classes bị chặn, kể cả OWNER (400 MODULE_NOT_ENABLED)")
    void inactiveStudentManagementBlocksStudentsAndClasses() {
        when(actor.orgId()).thenReturn("org-unauthorized");
        when(identityClient.activeModules("org-unauthorized")).thenReturn(List.of()); // No STUDENT_MANAGEMENT

        assertThatThrownBy(() -> studentService.list(1, 20, null, null, null))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> {
                ApiException apiEx = (ApiException) ex;
                assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                assertThat(apiEx.getCode()).isEqualTo("MODULE_NOT_ENABLED");
            });

        assertThatThrownBy(() -> classService.list(1, 20, null, null))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> {
                ApiException apiEx = (ApiException) ex;
                assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                assertThat(apiEx.getCode()).isEqualTo("MODULE_NOT_ENABLED");
            });
    }

    @Test
    @DisplayName("Identity lỗi/timeout khi kiểm tra module: 503 IDENTITY_UNAVAILABLE")
    void identityUnavailableThrows503() {
        when(actor.orgId()).thenReturn("org-1");
        when(identityClient.activeModules("org-1"))
            .thenThrow(new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "IDENTITY_UNAVAILABLE", "Identity service unavailable"));

        assertThatThrownBy(() -> studentService.list(1, 20, null, null, null))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> {
                ApiException apiEx = (ApiException) ex;
                assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                assertThat(apiEx.getCode()).isEqualTo("IDENTITY_UNAVAILABLE");
            });
    }

    @Test
    @DisplayName("STAFF thuộc phòng KHÔNG phụ trách STUDENT_MANAGEMENT có chức vụ chứa STUDENT_EDIT: quyền hiệu lực không có STUDENT_EDIT")
    void staffInDepartmentWithoutModuleLosesStudentEditPermission() {
        when(identityClient.permissions()).thenReturn(List.of(
            new PermissionResponse("PEOPLE_VIEW", "View department members", null),
            new PermissionResponse("STUDENT_EDIT", "Edit students", "STUDENT_MANAGEMENT")
        ));
        // Department has no modules
        when(jdbc.queryForList(anyString(), eq(String.class), eq("dept-no-student"), eq("org-1")))
            .thenReturn(List.of());

        Set<String> effective = effectivePermissions.compute("org-1", "dept-no-student", Set.of("PEOPLE_VIEW", "STUDENT_EDIT"));
        assertThat(effective).containsExactly("PEOPLE_VIEW");
        assertThat(effective).doesNotContain("STUDENT_EDIT");
    }

    @Test
    @DisplayName("Gỡ module khỏi phòng, refresh: quyền sinh viên biến mất")
    void removingModuleFromDepartmentStripsStudentPermissionsOnRefresh() {
        when(identityClient.permissions()).thenReturn(List.of(
            new PermissionResponse("STUDENT_VIEW", "View students", "STUDENT_MANAGEMENT"),
            new PermissionResponse("STUDENT_EDIT", "Edit students", "STUDENT_MANAGEMENT")
        ));

        // Before removal: department had STUDENT_MANAGEMENT
        when(jdbc.queryForList(anyString(), eq(String.class), eq("dept-1"), eq("org-1")))
            .thenReturn(List.of("STUDENT_MANAGEMENT"));
        Set<String> before = effectivePermissions.compute("org-1", "dept-1", Set.of("STUDENT_VIEW", "STUDENT_EDIT"));
        assertThat(before).containsExactlyInAnyOrder("STUDENT_VIEW", "STUDENT_EDIT");

        // After removal: department has no modules
        when(jdbc.queryForList(anyString(), eq(String.class), eq("dept-1"), eq("org-1")))
            .thenReturn(List.of());
        Set<String> after = effectivePermissions.compute("org-1", "dept-1", Set.of("STUDENT_VIEW", "STUDENT_EDIT"));
        assertThat(after).isEmpty();
    }

    @Test
    @DisplayName("Người tổ chức A không đọc/sửa/xóa được sinh viên/lớp tổ chức B (404 STUDENT_NOT_FOUND / CLASS_NOT_FOUND)")
    void crossOrganizationAccessReturns404() {
        when(actor.orgId()).thenReturn("org-A");
        when(identityClient.activeModules("org-A")).thenReturn(List.of("STUDENT_MANAGEMENT"));

        when(studentRepository.require("student-B", "org-A", false))
            .thenThrow(new ApiException(HttpStatus.NOT_FOUND, "STUDENT_NOT_FOUND", "Student not found"));
        when(classRepository.require("class-B", "org-A", false))
            .thenThrow(new ApiException(HttpStatus.NOT_FOUND, "CLASS_NOT_FOUND", "Class not found"));

        assertThatThrownBy(() -> studentService.get("student-B"))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo("STUDENT_NOT_FOUND"));

        assertThatThrownBy(() -> classService.get("class-B"))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo("CLASS_NOT_FOUND"));
    }

    @Test
    @DisplayName("Trùng student_code / class_code trong cùng tổ chức: 409 CONFLICT")
    void duplicateCodeInSameOrgThrows409() {
        when(actor.orgId()).thenReturn("org-1");
        when(identityClient.activeModules("org-1")).thenReturn(List.of("STUDENT_MANAGEMENT"));

        doThrow(new ApiException(HttpStatus.CONFLICT, "CONFLICT", "Student code already exists in organization"))
            .when(studentRepository).checkStudentCodeAvailable("org-1", "STU001");

        doThrow(new ApiException(HttpStatus.CONFLICT, "CONFLICT", "Class code already exists in organization"))
            .when(classRepository).checkClassCodeAvailable("org-1", "CLS001");

        StudentRequest stuReq = new StudentRequest("STU001", "John", LocalDate.of(2000, 1, 1), null, null, "active");
        SchoolClassRequest clsReq = new SchoolClassRequest("CLS001", "Class 1", "2026", "active");

        assertThatThrownBy(() -> studentService.create(stuReq))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT));

        assertThatThrownBy(() -> classService.create(clsReq))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    @DisplayName("Xóa lớp còn sinh viên: 409 CLASS_NOT_EMPTY")
    void deleteClassWithEnrolledStudentsThrows409() {
        when(actor.orgId()).thenReturn("org-1");
        when(identityClient.activeModules("org-1")).thenReturn(List.of("STUDENT_MANAGEMENT"));

        SchoolClassResponse classMock = new SchoolClassResponse(
            "class-1", "org-1", "CLS001", "Math 101", "2026", "active", 5, "actor-1", Instant.now(), null
        );
        when(classRepository.require("class-1", "org-1", true)).thenReturn(classMock);
        doThrow(new ApiException(HttpStatus.CONFLICT, "CLASS_NOT_EMPTY", "Cannot delete class with enrolled students"))
            .when(classRepository).delete("class-1", "org-1");

        assertThatThrownBy(() -> classService.delete("class-1"))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> {
                ApiException apiEx = (ApiException) ex;
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
            "class-2", "org-1", "CLS002", "Physics 101", "2026", "active", 0, "actor-1", Instant.now(), null
        );
        when(classRepository.require("class-2", "org-1", true)).thenReturn(classMock);
        when(studentRepository.require("student-1", "org-1", true)).thenReturn(null);

        doThrow(new ApiException(HttpStatus.CONFLICT, "STUDENT_ALREADY_IN_CLASS", "Student is already enrolled in another class"))
            .when(classRepository).enrollStudent("class-2", "student-1", "org-1");

        assertThatThrownBy(() -> classService.addStudent("class-2", "student-1"))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> {
                ApiException apiEx = (ApiException) ex;
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
}
