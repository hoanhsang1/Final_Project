package com.mems.service;

import com.mems.client.IdentityClient;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.outbox.OutboxEventRepository;
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

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SchoolClassDepartmentFilterTest {

    @Mock private SchoolClassRepository repository;
    @Mock private StudentRepository studentRepository;
    @Mock private Actor actor;
    @Mock private IdentityClient identityClient;
    @Mock private PeopleAuditService audit;
    @Mock private TeacherRepository teacherRepository;
    @Mock private ClassStatusService classStatusService;
    @Mock private SubjectRepository subjectRepository;
    @Mock private OutboxEventRepository outbox;

    private SchoolClassService service;

    @BeforeEach
    void setUp() {
        var moduleGuard = new OrganizationModuleGuard(identityClient);
        service = new SchoolClassService(repository, studentRepository, actor, moduleGuard, audit,
            teacherRepository, classStatusService, subjectRepository, mock(ClassSubjectService.class),
            outbox, "TEACHER_ASSIGNMENT");
        when(actor.orgId()).thenReturn("org-1");
        when(identityClient.moduleStatus("org-1")).thenReturn(List.of(
            Map.of("code", "STUDENT_MANAGEMENT", "status", "active")));
        when(actor.forbidden(anyString()))
            .thenReturn(new AppException(ErrorCode.FORBIDDEN, "forbidden"));
        when(repository.list(anyString(), anyInt(), anyInt(), nullable(String.class),
            nullable(String.class), anyBoolean(), nullable(Boolean.class), nullable(String.class),
            nullable(Set.class), anyBoolean())).thenReturn(Map.of("items", List.of()));
    }

    @Test
    @DisplayName("Có departmentId: chỉ lọc lớp của đúng phòng ban được yêu cầu")
    void scopesToRequestedDepartment() {
        when(actor.owner()).thenReturn(false);
        when(actor.hasOrganizationScope("class.view")).thenReturn(false);
        when(actor.departmentScopes("class.view")).thenReturn(Set.of("dept-A", "dept-B"));

        service.list(1, 20, null, null, true, null, "dept-A");

        verify(repository).list(eq("org-1"), eq(1), eq(20), isNull(), isNull(), eq(true), isNull(),
            isNull(), eq(Set.of("dept-A")), eq(false));
    }

    @Test
    @DisplayName("hasSubjects=true: chuyển xuống repository để chỉ trả lớp đã có môn học")
    void passesHasSubjectsToRepository() {
        when(actor.owner()).thenReturn(true);

        service.list(1, 20, null, null, true, null, "dept-A", true);

        verify(repository).list(eq("org-1"), eq(1), eq(20), isNull(), isNull(), eq(true), isNull(),
            isNull(), eq(Set.of("dept-A")), eq(true));
    }

    @Test
    @DisplayName("departmentId ngoài phạm vi xem của người dùng: 403 thay vì trả rỗng")
    void rejectsDepartmentOutsideScope() {
        when(actor.owner()).thenReturn(false);
        when(actor.hasOrganizationScope("class.view")).thenReturn(false);
        when(actor.departmentScopes("class.view")).thenReturn(Set.of("dept-B"));

        assertThatThrownBy(() -> service.list(1, 20, null, null, true, null, "dept-A"))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("FORBIDDEN"));
    }

    @Test
    @DisplayName("OWNER không truyền departmentId: vẫn xem toàn tổ chức")
    void ownerWithoutDepartmentSeesOrganization() {
        when(actor.owner()).thenReturn(true);

        service.list(1, 20, null, null, true, null, null);

        verify(repository).list(eq("org-1"), eq(1), eq(20), isNull(), isNull(), eq(true), isNull(),
            isNull(), isNull(), eq(false));
    }
}
