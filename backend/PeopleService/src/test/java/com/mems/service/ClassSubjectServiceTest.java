package com.mems.service;

import com.mems.dto.ApplyCurriculumRequest;
import com.mems.dto.ClassSubjectListResponse;
import com.mems.dto.CurriculumSubjectResponse;
import com.mems.dto.SchoolClassResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.ClassSubjectRepository;
import com.mems.repository.CurriculumRepository;
import com.mems.repository.SchoolClassRepository;
import com.mems.repository.SubjectRepository;
import com.mems.repository.TeacherRepository;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClassSubjectServiceTest {

    private static final String ORG = "org-1";
    private static final String USER = "user-1";
    private static final String CLASS_ID = "class-1";
    private static final String CUR = "cur-1";

    @Mock
    private ClassSubjectRepository repo;
    @Mock
    private SchoolClassRepository classRepo;
    @Mock
    private SubjectRepository subjectRepo;
    @Mock
    private CurriculumRepository curriculumRepo;
    @Mock
    private TeacherRepository teacherRepo;
    @Mock
    private Actor actor;
    @Mock
    private OrganizationModuleGuard moduleGuard;
    @Mock
    private PeopleAuditService audit;

    @InjectMocks
    private ClassSubjectService service;

    @BeforeEach
    void setUp() {
        when(actor.orgId()).thenReturn(ORG);
        lenient().when(actor.userId()).thenReturn(USER);
        lenient().when(classRepo.require(CLASS_ID, ORG, false)).thenReturn(schoolClass(3));
    }

    @Test
    @DisplayName("TC-APPLY-001: chặn áp chương trình khi môn tiên quyết không ở giai đoạn trước")
    void rejectsStageOrderViolation() {
        when(curriculumRepo.listSubjects(CUR)).thenReturn(List.of(
            response("a", 1, null),
            response("b", 1, List.of("a"))));
        when(curriculumRepo.prerequisiteEdges(CUR)).thenReturn(Map.of("b", List.of("a")));

        ApplyCurriculumRequest request = new ApplyCurriculumRequest(CUR, 3, null, null);

        assertThatThrownBy(() -> service.applyCurriculum(CLASS_ID, request))
            .isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.PREREQUISITE_STAGE_INVALID));
        verify(classRepo, never()).setCurriculum(anyString(), anyString(), anyString(), org.mockito.ArgumentMatchers.anyLong());
        verify(repo, never()).applyCurriculum(anyString(), anyString(), org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    @DisplayName("TC-APPLY-002: áp chương trình hợp lệ thì đặt curriculum và thêm môn còn thiếu")
    void appliesCurriculumWhenStagesAreOrdered() {
        when(curriculumRepo.listSubjects(CUR)).thenReturn(List.of(
            response("a", 1, null),
            response("b", 2, List.of("a"))));
        when(curriculumRepo.prerequisiteEdges(CUR)).thenReturn(Map.of("b", List.of("a")));
        when(classRepo.setCurriculum(CLASS_ID, ORG, CUR, 3L)).thenReturn(1);
        when(repo.applyCurriculum(CLASS_ID, CUR, List.of(
            response("a", 1, null), response("b", 2, List.of("a"))))).thenReturn(2);
        when(repo.list(CLASS_ID)).thenReturn(new ClassSubjectListResponse(CLASS_ID, CUR, List.of()));

        ClassSubjectListResponse result = service.applyCurriculum(CLASS_ID,
            new ApplyCurriculumRequest(CUR, 3, null, null));

        assertThat(result.curriculumId()).isEqualTo(CUR);
        verify(classRepo).setCurriculum(CLASS_ID, ORG, CUR, 3L);
        verify(repo).applyCurriculum(CLASS_ID, CUR, List.of(
            response("a", 1, null), response("b", 2, List.of("a"))));
    }

    private SchoolClassResponse schoolClass(long version) {
        return new SchoolClassResponse(CLASS_ID, ORG, "C1", "Lớp 1", "2026-2027",
            LocalDate.of(2026, 1, 5), LocalDate.of(2026, 6, 30), "CHUA_BAT_DAU", null,
            "NONE", version, 20, USER, null, null);
    }

    private CurriculumSubjectResponse response(String subjectId, int sequenceNo,
                                               List<String> prerequisites) {
        return new CurriculumSubjectResponse(CUR, subjectId, "CODE-" + subjectId,
            "Môn " + subjectId, sequenceNo, 10, 90, 2, null, null, true, null, prerequisites);
    }
}
