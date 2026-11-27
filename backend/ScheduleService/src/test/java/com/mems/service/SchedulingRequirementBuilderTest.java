package com.mems.service;

import com.mems.client.ClassInfo;
import com.mems.client.ClassSubjectInfo;
import com.mems.client.EligibleTeacherInfo;
import com.mems.client.PeopleClient;
import com.mems.dto.SchedulingRequirements;
import com.mems.dto.SessionRequirement;
import com.mems.dto.UnschedulableRequirement;
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
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SchedulingRequirementBuilderTest {

    private static final String ORG = "org-1";
    private static final String CLASS_ID = "class-1";

    @Mock
    private PeopleClient people;
    @Mock
    private ScheduleService scheduleService;

    @InjectMocks
    private SchedulingRequirementBuilder builder;

    @Test
    @DisplayName("TC-BUILD-001: giai đoạn sau bắt đầu ngay sau giai đoạn trước")
    void buildsStageWindowsSequentially() {
        ClassInfo info = classInfo("DANG_DIEN_RA", "NONE",
            LocalDate.of(2026, 1, 5), LocalDate.of(2026, 12, 31));
        when(people.classInfo(ORG, CLASS_ID)).thenReturn(info);
        when(people.classSubjects(ORG, CLASS_ID)).thenReturn(List.of(
            subject("sub-1", "Toán", 4, 2, 1, "cat-1", null),
            subject("sub-2", "Lý", 2, 2, 2, "cat-1", null)));
        when(scheduleService.countScheduledSessions(ORG, CLASS_ID, "sub-1", "Toán")).thenReturn(0);
        when(scheduleService.countScheduledSessions(ORG, CLASS_ID, "sub-2", "Lý")).thenReturn(0);
        EligibleTeacherInfo t1 = new EligibleTeacherInfo("t-1", "GV 1", "dept-1");
        EligibleTeacherInfo t2 = new EligibleTeacherInfo("t-2", "GV 2", "dept-1");
        when(people.eligibleTeachersBatch(eq(ORG), anyCollection()))
            .thenReturn(Map.of("sub-1", List.of(t1), "sub-2", List.of(t2)));

        SchedulingRequirements result = builder.build(ORG, List.of(CLASS_ID), null, null);

        assertThat(result.unschedulable()).isEmpty();
        assertThat(result.requirements()).hasSize(2);
        SessionRequirement stage1 = result.requirements().get(0);
        assertThat(stage1.stageNo()).isEqualTo(1);
        assertThat(stage1.windowFrom()).isEqualTo(LocalDate.of(2026, 1, 5));
        assertThat(stage1.windowTo()).isEqualTo(LocalDate.of(2026, 1, 18));
        SessionRequirement stage2 = result.requirements().get(1);
        assertThat(stage2.stageNo()).isEqualTo(2);
        assertThat(stage2.windowFrom()).isEqualTo(LocalDate.of(2026, 1, 19));
        assertThat(stage2.windowTo()).isEqualTo(LocalDate.of(2026, 1, 25));
        assertThat(stage2.candidateTeachers()).containsExactly(t2);
    }

    @Test
    @DisplayName("TC-BUILD-002: môn đã đủ buổi thì bỏ qua, không sinh yêu cầu")
    void skipsFulfilledSubject() {
        when(people.classInfo(ORG, CLASS_ID)).thenReturn(classInfo("DANG_DIEN_RA", "NONE",
            LocalDate.of(2026, 1, 5), LocalDate.of(2026, 12, 31)));
        when(people.classSubjects(ORG, CLASS_ID)).thenReturn(List.of(
            subject("sub-1", "Toán", 4, 2, 1, "cat-1", "t-1")));
        when(scheduleService.countScheduledSessions(ORG, CLASS_ID, "sub-1", "Toán")).thenReturn(4);

        SchedulingRequirements result = builder.build(ORG, List.of(CLASS_ID), null, null);

        assertThat(result.requirements()).isEmpty();
        assertThat(result.unschedulable()).isEmpty();
        verify(people, never()).eligibleTeachersBatch(org.mockito.ArgumentMatchers.anyString(),
            anyCollection());
    }

    @Test
    @DisplayName("TC-BUILD-003: không có giáo viên đủ điều kiện thì báo lý do, không dùng giáo viên chủ nhiệm")
    void noEligibleTeacherIsUnschedulableWithoutHomeroomFallback() {
        // Lớp có giáo viên chủ nhiệm nhưng môn không có giáo viên đủ điều kiện: KHÔNG fallback.
        ClassInfo info = classInfo("DANG_DIEN_RA", "NONE",
            LocalDate.of(2026, 1, 5), LocalDate.of(2026, 12, 31));
        assertThat(info.teacherId()).isEqualTo("homeroom-1");
        when(people.classInfo(ORG, CLASS_ID)).thenReturn(info);
        when(people.classSubjects(ORG, CLASS_ID)).thenReturn(List.of(
            subject("sub-1", "Toán", 4, 2, 1, "cat-1", null)));
        when(scheduleService.countScheduledSessions(ORG, CLASS_ID, "sub-1", "Toán")).thenReturn(0);
        when(people.eligibleTeachersBatch(eq(ORG), anyCollection()))
            .thenReturn(Map.of("sub-1", List.of()));

        SchedulingRequirements result = builder.build(ORG, List.of(CLASS_ID), null, null);

        assertThat(result.requirements()).isEmpty();
        assertThat(result.unschedulable()).hasSize(1);
        assertThat(result.unschedulable().get(0).reasonCode()).isEqualTo("NO_ELIGIBLE_TEACHER");
    }

    @Test
    @DisplayName("TC-BUILD-004: lớp đã hủy bị loại khỏi lượt dựng yêu cầu")
    void cancelledClassIsSkipped() {
        when(people.classInfo(ORG, CLASS_ID)).thenReturn(classInfo("DA_HUY", "NONE",
            LocalDate.of(2026, 1, 5), LocalDate.of(2026, 12, 31)));

        SchedulingRequirements result = builder.build(ORG, List.of(CLASS_ID), null, null);

        assertThat(result.requirements()).isEmpty();
        assertThat(result.unschedulable()).extracting(UnschedulableRequirement::reasonCode)
            .containsExactly("CLASS_CANCELLED");
        verify(people, never()).classSubjects(ORG, CLASS_ID);
    }

    @Test
    @DisplayName("TC-BUILD-005: môn chưa gán danh mục thì báo lý do, các môn khác vẫn được dựng")
    void missingCategoryDoesNotBreakOtherSubjects() {
        when(people.classInfo(ORG, CLASS_ID)).thenReturn(classInfo("DANG_DIEN_RA", "NONE",
            LocalDate.of(2026, 1, 5), LocalDate.of(2026, 12, 31)));
        when(people.classSubjects(ORG, CLASS_ID)).thenReturn(List.of(
            subject("sub-1", "Toán", 4, 2, 1, null, "t-1"),
            subject("sub-2", "Lý", 2, 2, 1, "cat-1", "t-2")));
        when(scheduleService.countScheduledSessions(ORG, CLASS_ID, "sub-2", "Lý")).thenReturn(0);

        SchedulingRequirements result = builder.build(ORG, List.of(CLASS_ID), null, null);

        assertThat(result.unschedulable()).extracting(UnschedulableRequirement::reasonCode)
            .containsExactly("SUBJECT_CATEGORY_MISSING");
        assertThat(result.requirements()).extracting(SessionRequirement::subjectId)
            .containsExactly("sub-2");
    }

    @Test
    @DisplayName("TC-BUILD-006: cửa sổ cắt theo khoảng người dùng chọn và cảnh báo vượt ngày kết thúc lớp")
    void clipsWindowsByUserRangeAndClassEnd() {
        when(people.classInfo(ORG, CLASS_ID)).thenReturn(classInfo("DANG_DIEN_RA", "NONE",
            LocalDate.of(2026, 1, 5), LocalDate.of(2026, 1, 10)));
        when(people.classSubjects(ORG, CLASS_ID)).thenReturn(List.of(
            subject("sub-1", "Toán", 4, 2, 1, "cat-1", "t-1")));
        when(scheduleService.countScheduledSessions(ORG, CLASS_ID, "sub-1", "Toán")).thenReturn(0);

        SchedulingRequirements result = builder.build(ORG, List.of(CLASS_ID),
            LocalDate.of(2026, 1, 6), LocalDate.of(2026, 6, 30));

        assertThat(result.requirements()).hasSize(1);
        SessionRequirement requirement = result.requirements().get(0);
        assertThat(requirement.windowFrom()).isEqualTo(LocalDate.of(2026, 1, 6));
        assertThat(requirement.windowTo()).isEqualTo(LocalDate.of(2026, 1, 10));
        assertThat(result.unschedulable()).extracting(UnschedulableRequirement::reasonCode)
            .containsExactly("STAGE_EXCEEDS_CLASS_END");
    }

    private ClassInfo classInfo(String status, String closeState, LocalDate start, LocalDate end) {
        return new ClassInfo(CLASS_ID, ORG, "C1", "Lớp 1", status, closeState,
            "homeroom-1", "GV chủ nhiệm", start, end, "sub-1", "Toán", 20);
    }

    private ClassSubjectInfo subject(String id, String name, int planned, Integer perWeek,
                                     Integer stage, String categoryId, String teacherId) {
        String teacherName = teacherId != null ? "GV " + id : null;
        return new ClassSubjectInfo(CLASS_ID, id, "CODE-" + id, name, "CURRICULUM", "cur-1",
            planned, planned, 90, perWeek, stage, categoryId, "ANY",
            teacherId, teacherName, false, "PLANNED");
    }
}
