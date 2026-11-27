package com.mems.service;

import com.mems.client.IdentityClient;
import com.mems.dto.ApplyCurriculumRequest;
import com.mems.dto.SchoolClassRequest;
import com.mems.dto.SchoolClassResponse;
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
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SchoolClassCurriculumCreateTest {

    private static final String ORG = "org-1";
    private static final String USER = "user-1";
    private static final String CUR = "cur-1";

    @Mock private SchoolClassRepository classes;
    @Mock private StudentRepository students;
    @Mock private Actor actor;
    @Mock private IdentityClient identityClient;
    @Mock private PeopleAuditService audit;
    @Mock private TeacherRepository teachers;
    @Mock private ClassStatusService classStatusService;
    @Mock private SubjectRepository subjects;
    @Mock private ClassSubjectService classSubjectService;
    @Mock private OutboxEventRepository outbox;

    private SchoolClassService service;

    @BeforeEach
    void setUp() {
        service = new SchoolClassService(classes, students, actor,
            new OrganizationModuleGuard(identityClient), audit, teachers, classStatusService, subjects,
            classSubjectService, outbox, "TEACHER_ASSIGNMENT");
        when(actor.orgId()).thenReturn(ORG);
        when(actor.userId()).thenReturn(USER);
        when(identityClient.activeModules(ORG)).thenReturn(List.of("STUDENT_MANAGEMENT"));
        when(classes.create(anyString(), eq(ORG), anyString(), anyString(), any(), any(), any(), any(),
            any(), eq(USER))).thenReturn(classRow("class-1", 0));
    }

    @Test
    @DisplayName("Tạo lớp kèm curriculumId: áp chương trình ngay và trả lớp đã tăng version")
    void createWithCurriculumAppliesIt() {
        when(classes.require(anyString(), eq(ORG), eq(false))).thenReturn(classRow("class-1", 1));

        SchoolClassResponse result = service.create(request(CUR));

        ArgumentCaptor<String> classId = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<ApplyCurriculumRequest> applied =
            ArgumentCaptor.forClass(ApplyCurriculumRequest.class);
        verify(classSubjectService).applyCurriculum(classId.capture(), applied.capture());
        assertThat(applied.getValue().curriculumId()).isEqualTo(CUR);
        assertThat(applied.getValue().version()).isZero();
        verify(classes).require(classId.getValue(), ORG, false);
        assertThat(result.version()).isEqualTo(1);
    }

    @Test
    @DisplayName("Không chọn chương trình: chỉ tạo lớp, không áp gì")
    void createWithoutCurriculumSkipsApply() {
        SchoolClassResponse result = service.create(request(null));

        verify(classSubjectService, never()).applyCurriculum(anyString(), any());
        assertThat(result.version()).isZero();
    }

    @Test
    @DisplayName("Chương trình để trống: coi như không chọn")
    void createWithBlankCurriculumSkipsApply() {
        service.create(request("   "));

        verify(classSubjectService, never()).applyCurriculum(anyString(), any());
    }

    @Test
    @DisplayName("Áp chương trình lỗi: lỗi lan ra ngoài để transaction tạo lớp rollback")
    void curriculumFailurePropagates() {
        when(classSubjectService.applyCurriculum(anyString(), any()))
            .thenThrow(new AppException(ErrorCode.CURRICULUM_NOT_FOUND));

        assertThatThrownBy(() -> service.create(request(CUR)))
            .isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.CURRICULUM_NOT_FOUND));
        verify(classes, never()).require(anyString(), anyString(), eq(false));
    }

    private SchoolClassRequest request(String curriculumId) {
        return new SchoolClassRequest("LH-10A1", "Lớp 10A1", "2026-2027", null, curriculumId,
            null, null, null);
    }

    private SchoolClassResponse classRow(String id, long version) {
        return new SchoolClassResponse(id, ORG, "LH-10A1", "Lớp 10A1", "2026-2027", null, null,
            "CHUA_BAT_DAU", null, "NONE", version, 0, USER, null, null);
    }
}
