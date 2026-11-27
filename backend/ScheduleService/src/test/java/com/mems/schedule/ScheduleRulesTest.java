package com.mems.schedule;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ScheduleRulesTest {

    @Test
    void classWithoutRulesIsAlwaysAllowed() {
        assertThat(ScheduleRules.isPeriodAllowedForClass(List.of(), 2, 1)).isTrue();
    }

    @Test
    void offRuleBlocksCoveredPeriod() {
        List<ClassSlotRule> rules = List.of(new ClassSlotRule(2, 1, 3, true));

        assertThat(ScheduleRules.isPeriodAllowedForClass(rules, 2, 2)).isFalse();
        assertThat(ScheduleRules.isPeriodAllowedForClass(rules, 2, 4)).isTrue();
        assertThat(ScheduleRules.isPeriodAllowedForClass(rules, 3, 2)).isTrue();
    }

    @Test
    void allowRulesActAsWhitelistAndOffWins() {
        List<ClassSlotRule> rules = List.of(
            new ClassSlotRule(2, 1, 2, false),
            new ClassSlotRule(2, 5, 6, false),
            new ClassSlotRule(2, 2, 2, true));

        assertThat(ScheduleRules.isPeriodAllowedForClass(rules, 2, 1)).isTrue();
        assertThat(ScheduleRules.isPeriodAllowedForClass(rules, 2, 2)).isFalse();
        assertThat(ScheduleRules.isPeriodAllowedForClass(rules, 2, 3)).isFalse();
        assertThat(ScheduleRules.isPeriodAllowedForClass(rules, 2, 6)).isTrue();
    }

    @Test
    void teacherWithoutRulesIsFree() {
        assertThat(ScheduleRules.isTeacherFree(List.of(), 4, 5)).isTrue();
    }

    @Test
    void unavailableBlocksAndAvailableIsWhitelist() {
        List<TeacherAvailability> entries = List.of(
            new TeacherAvailability(4, 1, 3, TeacherAvailability.Kind.AVAILABLE),
            new TeacherAvailability(4, 2, 2, TeacherAvailability.Kind.UNAVAILABLE));

        assertThat(ScheduleRules.isTeacherFree(entries, 4, 1)).isTrue();
        assertThat(ScheduleRules.isTeacherFree(entries, 4, 2)).isFalse();
        assertThat(ScheduleRules.isTeacherFree(entries, 4, 4)).isFalse();
        assertThat(ScheduleRules.isTeacherFree(entries, 5, 2)).isTrue();
    }

    @Test
    void sessionPeriodsJoinsAdjacentPeriods() {
        List<TimeSlot> slots = List.of(
            slot(1, "07:00", "07:45", true),
            slot(2, "07:45", "08:30", false),
            slot(3, "08:40", "09:25", false));

        assertThat(ScheduleRules.sessionPeriods(slots, 1, 90)).containsExactly(1, 2);
        assertThat(ScheduleRules.sessionPeriods(slots, 2, 45)).containsExactly(2);
    }

    @Test
    void sessionPeriodsRejectsEndingAfterJoinedPeriod() {
        List<TimeSlot> slots = List.of(
            slot(1, "07:00", "07:45", true),
            slot(2, "07:45", "08:30", true),
            slot(3, "08:30", "09:15", false));

        assertThat(ScheduleRules.sessionPeriods(slots, 1, 45)).isEmpty();
        assertThat(ScheduleRules.sessionPeriods(slots, 2, 45)).isEmpty();
        assertThat(ScheduleRules.sessionPeriods(slots, 1, 135)).containsExactly(1, 2, 3);
    }

    @Test
    void sessionPeriodsRejectsBreakGapAndUnknownDurations() {
        List<TimeSlot> slots = List.of(
            slot(1, "07:00", "07:45", true),
            slot(2, "07:50", "08:35", false));

        assertThat(ScheduleRules.sessionPeriods(slots, 1, 90)).isEmpty();
        assertThat(ScheduleRules.sessionPeriods(slots, 1, 60)).isEmpty();
        assertThat(ScheduleRules.sessionPeriods(slots, 9, 45)).isEmpty();
    }

    @Test
    void sessionPeriodsIgnoresInactivePeriods() {
        List<TimeSlot> slots = List.of(
            new TimeSlot("1", 1, "Tiết 1", LocalTime.of(7, 0), LocalTime.of(7, 45), true, false),
            slot(2, "07:45", "08:30", false));

        assertThat(ScheduleRules.sessionPeriods(slots, 1, 45)).isEmpty();
    }

    @Test
    void toInstantRangeUsesVietnamTimezone() {
        List<TimeSlot> slots = List.of(
            slot(2, "07:45", "08:30", false),
            slot(1, "07:00", "07:45", true));

        TimeRange range = ScheduleRules.toInstantRange(LocalDate.of(2026, 11, 30), slots);

        assertThat(range.start()).isEqualTo(Instant.parse("2026-11-30T00:00:00Z"));
        assertThat(range.end()).isEqualTo(Instant.parse("2026-11-30T01:30:00Z"));
    }

    @Test
    void toInstantRangeRejectsEmptyInput() {
        assertThatThrownBy(() -> ScheduleRules.toInstantRange(LocalDate.now(), List.of()))
            .isInstanceOf(IllegalArgumentException.class);
    }

    private static TimeSlot slot(int periodNo, String start, String end, boolean joinsNext) {
        return new TimeSlot("slot-" + periodNo, periodNo, "Tiết " + periodNo,
            LocalTime.parse(start), LocalTime.parse(end), joinsNext, true);
    }
}
