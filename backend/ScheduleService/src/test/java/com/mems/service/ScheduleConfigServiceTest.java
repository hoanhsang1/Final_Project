package com.mems.service;

import com.mems.client.ClassInfo;
import com.mems.client.PeopleClient;
import com.mems.dto.ClassSlotRuleDto;
import com.mems.dto.ClassSlotRulesRequest;
import com.mems.dto.TeacherAvailabilityDto;
import com.mems.dto.TeacherAvailabilityRequest;
import com.mems.dto.TimeSlotConfigRequest;
import com.mems.dto.TimeSlotRequest;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.ClassSlotRuleRepository;
import com.mems.repository.TeacherAvailabilityRepository;
import com.mems.repository.TimeSlotRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@JdbcTest
class ScheduleConfigServiceTest {
    private static final String ORG = "org-schedule";
    private static final String OTHER_ORG = "org-other";
    private static final String CLASS_ID = "class-1";
    private static final String TEACHER_ID = "teacher-1";

    @Autowired
    private JdbcTemplate jdbc;

    @MockBean
    private PeopleClient people;

    private ScheduleConfigService service;

    @BeforeEach
    void setUp() {
        service = new ScheduleConfigService(
            new TimeSlotRepository(jdbc),
            new ClassSlotRuleRepository(jdbc),
            new TeacherAvailabilityRepository(jdbc),
            people);
    }

    @Test
    void replacesAndListsTimeSlotsPerOrganization() {
        service.replaceTimeSlots(ORG, new TimeSlotConfigRequest(List.of(
            slot(1, "07:00", "07:45", true),
            slot(2, "07:45", "08:30", false))));

        var response = service.listTimeSlots(ORG);

        assertThat(response.slots()).extracting(s -> s.periodNo()).containsExactly(1, 2);
        assertThat(response.slots().get(0).startTime()).isEqualTo(LocalTime.of(7, 0));
        assertThat(service.listTimeSlots(OTHER_ORG).slots()).isEmpty();

        service.replaceTimeSlots(ORG, new TimeSlotConfigRequest(List.of(
            slot(1, "07:00", "07:45", false))));

        assertThat(service.listTimeSlots(ORG).slots()).hasSize(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM time_slot WHERE org_id=?", Integer.class, ORG))
            .isEqualTo(1);
    }

    @Test
    void rejectsTimeSlotsThatAreNotContiguous() {
        assertThatThrownBy(() -> service.replaceTimeSlots(ORG, new TimeSlotConfigRequest(List.of(
            slot(1, "07:00", "07:45", false),
            slot(3, "07:45", "08:30", false)))))
            .isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.TIME_SLOT_INVALID));
    }

    @Test
    void rejectsJoinedPeriodWithTimeGap() {
        assertThatThrownBy(() -> service.replaceTimeSlots(ORG, new TimeSlotConfigRequest(List.of(
            slot(1, "07:00", "07:45", true),
            slot(2, "07:50", "08:35", false)))))
            .isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.TIME_SLOT_INVALID));
    }

    @Test
    void requiresAtLeastOneTimeSlot() {
        assertThatThrownBy(() -> service.replaceTimeSlots(ORG, new TimeSlotConfigRequest(List.of())))
            .isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.TIME_SLOTS_REQUIRED));
    }

    @Test
    void replacesClassRulesWhenClassBelongsToOrganization() {
        when(people.classInfo(anyString(), anyString())).thenReturn(classInfo());
        service.replaceTimeSlots(ORG, new TimeSlotConfigRequest(List.of(
            slot(1, "07:00", "07:45", false),
            slot(2, "07:45", "08:30", false))));

        var response = service.replaceClassRules(ORG, CLASS_ID, new ClassSlotRulesRequest(List.of(
            new ClassSlotRuleDto(2, 1, 2, false),
            new ClassSlotRuleDto(2, 2, 2, true))));

        assertThat(response.classId()).isEqualTo(CLASS_ID);
        assertThat(response.rules()).hasSize(2);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM class_slot_rule WHERE org_id=? AND class_id=?",
            Integer.class, ORG, CLASS_ID)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM class_slot_rule WHERE org_id=?",
            Integer.class, OTHER_ORG)).isZero();
    }

    @Test
    void rejectsClassRulesOutsideConfiguredPeriods() {
        when(people.classInfo(anyString(), anyString())).thenReturn(classInfo());
        service.replaceTimeSlots(ORG, new TimeSlotConfigRequest(List.of(
            slot(1, "07:00", "07:45", false))));

        assertThatThrownBy(() -> service.replaceClassRules(ORG, CLASS_ID,
            new ClassSlotRulesRequest(List.of(new ClassSlotRuleDto(2, 1, 3, false)))))
            .isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.CLASS_SLOT_RULE_INVALID));
    }

    @Test
    void rejectsUnknownClass() {
        when(people.classInfo(anyString(), anyString())).thenReturn(null);

        assertThatThrownBy(() -> service.getClassRules(ORG, CLASS_ID))
            .isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.CLASS_NOT_FOUND));
    }

    @Test
    void replacesTeacherAvailabilityWhenTeacherBelongsToOrganization() {
        when(people.teacherExists(anyString(), anyString())).thenReturn(true);
        service.replaceTimeSlots(ORG, new TimeSlotConfigRequest(List.of(
            slot(1, "07:00", "07:45", false),
            slot(2, "07:45", "08:30", false))));

        var response = service.replaceTeacherAvailability(ORG, TEACHER_ID,
            new TeacherAvailabilityRequest(List.of(
                new TeacherAvailabilityDto(3, 1, 2, "AVAILABLE"),
                new TeacherAvailabilityDto(3, 2, 2, "UNAVAILABLE"))));

        assertThat(response.teacherId()).isEqualTo(TEACHER_ID);
        assertThat(response.entries()).extracting(TeacherAvailabilityDto::kind)
            .containsExactly("AVAILABLE", "UNAVAILABLE");
    }

    @Test
    void rejectsUnknownTeacher() {
        when(people.teacherExists(anyString(), anyString())).thenReturn(false);

        assertThatThrownBy(() -> service.getTeacherAvailability(ORG, TEACHER_ID))
            .isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.TEACHER_NOT_FOUND));
    }

    @Test
    void rejectsInvalidAvailabilityKind() {
        when(people.teacherExists(anyString(), anyString())).thenReturn(true);
        service.replaceTimeSlots(ORG, new TimeSlotConfigRequest(List.of(
            slot(1, "07:00", "07:45", false))));

        assertThatThrownBy(() -> service.replaceTeacherAvailability(ORG, TEACHER_ID,
            new TeacherAvailabilityRequest(List.of(
                new TeacherAvailabilityDto(3, 1, 1, "MAYBE")))))
            .isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.TEACHER_AVAILABILITY_INVALID));
    }

    @Test
    void emptyRulesClearConfiguration() {
        when(people.teacherExists(anyString(), anyString())).thenReturn(true);
        service.replaceTimeSlots(ORG, new TimeSlotConfigRequest(List.of(
            slot(1, "07:00", "07:45", false))));
        service.replaceTeacherAvailability(ORG, TEACHER_ID, new TeacherAvailabilityRequest(List.of(
            new TeacherAvailabilityDto(3, 1, 1, "UNAVAILABLE"))));

        service.replaceTeacherAvailability(ORG, TEACHER_ID, new TeacherAvailabilityRequest(List.of()));

        assertThat(service.getTeacherAvailability(ORG, TEACHER_ID).entries()).isEmpty();
    }

    private static TimeSlotRequest slot(int periodNo, String start, String end, boolean joinsNext) {
        return new TimeSlotRequest(periodNo, "Tiết " + periodNo,
            LocalTime.parse(start), LocalTime.parse(end), joinsNext, true);
    }

    private static ClassInfo classInfo() {
        return new ClassInfo(CLASS_ID, ORG, "C-01", "Lớp 1", "ACTIVE", null,
            TEACHER_ID, "Giáo viên", LocalDate.of(2026, 9, 1), LocalDate.of(2027, 5, 31),
            "Toán", 20);
    }
}
