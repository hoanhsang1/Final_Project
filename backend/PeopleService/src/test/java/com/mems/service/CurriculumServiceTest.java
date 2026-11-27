package com.mems.service;

import com.mems.dto.CurriculumSubjectRequest;
import com.mems.dto.CurriculumSubjectResponse;
import com.mems.dto.CurriculumSubjectUpdateRequest;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.CurriculumRepository;
import com.mems.repository.SubjectRepository;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CurriculumServiceTest {

    private static final String ORG = "org-1";
    private static final String USER = "user-1";
    private static final String CUR = "cur-1";

    @Mock
    private CurriculumRepository repo;
    @Mock
    private SubjectRepository subjectRepo;
    @Mock
    private Actor actor;
    @Mock
    private OrganizationModuleGuard moduleGuard;
    @Mock
    private PeopleAuditService audit;

    @InjectMocks
    private CurriculumService service;

    @BeforeEach
    void setUp() {
        when(actor.orgId()).thenReturn(ORG);
        lenient().when(actor.userId()).thenReturn(USER);
    }

    @Test
    @DisplayName("TC-CUR-001: môn không thể là tiên quyết của chính nó")
    void rejectsSelfPrerequisite() {
        CurriculumSubjectRequest request = new CurriculumSubjectRequest(
            "a", 1, 10, 90, null, null, null, true, null, List.of("a"));

        assertThatThrownBy(() -> service.addSubject(CUR, request))
            .isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.PREREQUISITE_CYCLE));
        verify(repo, never()).prerequisiteEdges(anyString());
    }

    @Test
    @DisplayName("TC-CUR-002: chặn vòng tiên quyết dài hơn 2 môn (a -> b -> c -> a)")
    void rejectsLongPrerequisiteCycle() {
        // Đã có b tiên quyết c, c tiên quyết a; thêm a với tiên quyết b sẽ tạo vòng.
        when(repo.prerequisiteEdges(CUR)).thenReturn(Map.of(
            "b", List.of("c"),
            "c", List.of("a")));
        CurriculumSubjectRequest request = new CurriculumSubjectRequest(
            "a", 1, 10, 90, null, null, null, true, null, List.of("b"));

        assertThatThrownBy(() -> service.addSubject(CUR, request))
            .isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.PREREQUISITE_CYCLE));
        verify(repo, never()).addSubject(anyString(), anyString(), anyInt(), anyInt(), anyInt(),
            any(), any(), any(), anyBoolean(), any(), any());
    }

    @Test
    @DisplayName("TC-CUR-003: chuỗi tiên quyết hợp lệ được lưu bình thường")
    void acceptsValidPrerequisiteChain() {
        when(repo.prerequisiteEdges(CUR)).thenReturn(Map.of("b", List.of("c")));
        CurriculumSubjectUpdateRequest request = new CurriculumSubjectUpdateRequest(
            2, 10, 90, null, null, null, true, null, List.of("b"));
        CurriculumSubjectResponse saved = new CurriculumSubjectResponse(CUR, "a", "A", "Môn A",
            2, 10, 90, null, null, null, true, null, List.of("b"));
        when(repo.updateSubject(eq(CUR), eq("a"), eq(2), eq(10), eq(90), isNull(), isNull(),
            isNull(), eq(true), isNull(), eq(List.of("b")))).thenReturn(saved);

        service.updateSubject(CUR, "a", request);

        verify(repo).updateSubject(eq(CUR), eq("a"), eq(2), eq(10), eq(90), isNull(), isNull(),
            isNull(), eq(true), isNull(), eq(List.of("b")));
    }

    @Test
    @DisplayName("TC-CUR-004: cạnh cũ của chính môn được thay thế khi kiểm tra vòng")
    void replacesOwnEdgesBeforeCycleCheck() {
        // a hiện tiên quyết b; đổi a sang tiên quyết c không tạo vòng (c không dẫn về a).
        when(repo.prerequisiteEdges(CUR)).thenReturn(Map.of("a", List.of("b")));
        CurriculumSubjectUpdateRequest request = new CurriculumSubjectUpdateRequest(
            2, 10, 90, null, null, null, true, null, List.of("c"));
        CurriculumSubjectResponse saved = new CurriculumSubjectResponse(CUR, "a", "A", "Môn A",
            2, 10, 90, null, null, null, true, null, List.of("c"));
        when(repo.updateSubject(eq(CUR), eq("a"), eq(2), eq(10), eq(90), isNull(), isNull(),
            isNull(), eq(true), isNull(), eq(List.of("c")))).thenReturn(saved);

        service.updateSubject(CUR, "a", request);

        verify(repo).updateSubject(eq(CUR), eq("a"), eq(2), eq(10), eq(90), isNull(), isNull(),
            isNull(), eq(true), isNull(), eq(List.of("c")));
    }
}
