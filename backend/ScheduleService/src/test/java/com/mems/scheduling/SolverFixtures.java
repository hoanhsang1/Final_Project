package com.mems.scheduling;

import com.mems.client.EligibleTeacherInfo;
import com.mems.dto.SessionRequirement;
import com.mems.schedule.ClassSlotRule;
import com.mems.schedule.ScheduleRules;
import com.mems.schedule.TeacherAvailability;
import com.mems.schedule.TimeRange;
import com.mems.schedule.TimeSlot;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

/** Dữ liệu mẫu dùng chung cho các bài kiểm thử bộ xếp lịch (không DB). */
final class SolverFixtures {

    /** 2026-11-30 là thứ Hai. */
    static final LocalDate WEEK1_MONDAY = LocalDate.of(2026, 11, 30);
    static final int SESSION_MINUTES = 90;

    private SolverFixtures() {
    }

    static LocalDate monday(int weekOffset) {
        return WEEK1_MONDAY.plusWeeks(weekOffset);
    }

    static LocalDate endOfWeek(int weekOffset) {
        return monday(weekOffset).plusDays(6);
    }

    /** 10 tiết 45 phút, nghỉ giữa các cặp tiết; chỉ tiết lẻ ghép được thành buổi 90 phút. */
    static List<TimeSlot> slots() {
        return List.of(
            slot(1, "07:00", "07:45", true),
            slot(2, "07:45", "08:30", false),
            slot(3, "08:40", "09:25", true),
            slot(4, "09:25", "10:10", false),
            slot(5, "10:20", "11:05", true),
            slot(6, "11:05", "11:50", false),
            slot(7, "13:00", "13:45", true),
            slot(8, "13:45", "14:30", false),
            slot(9, "14:40", "15:25", true),
            slot(10, "15:25", "16:10", false));
    }

    static TimeSlot slot(int periodNo, String start, String end, boolean joinsNext) {
        return new TimeSlot("slot-" + periodNo, periodNo, "Tiết " + periodNo,
            LocalTime.parse(start), LocalTime.parse(end), joinsNext, true);
    }

    static SolverRoom normal(String id, int capacity) {
        return new SolverRoom(id, id, capacity, "normal_room");
    }

    static SolverRoom computer(String id, int capacity) {
        return new SolverRoom(id, id, capacity, "computer_room");
    }

    static SessionRequirement requirement(String classId, String subjectId, String teacherId, int needed,
                                          int perWeek, int studentCount, String roomRequirement,
                                          LocalDate from, LocalDate to, int stageNo) {
        return new SessionRequirement(classId, classId, subjectId, subjectId, teacherId,
            List.of(new EligibleTeacherInfo(teacherId, teacherId, "DP")),
            needed, perWeek, SESSION_MINUTES, roomRequirement, studentCount, from, to, stageNo);
    }

    static SolverInput input(List<SessionRequirement> requirements, List<SolverRoom> rooms,
                             List<TimeSlot> slots) {
        return new SolverInput(requirements, slots, rooms, Map.of(), Map.of(), List.of(),
            SolverOptions.defaults());
    }

    static SolverInput input(List<SessionRequirement> requirements, List<SolverRoom> rooms,
                             List<TimeSlot> slots, Map<String, List<ClassSlotRule>> classRules,
                             Map<String, List<TeacherAvailability>> availability,
                             List<ExistingSession> existing, SolverOptions options) {
        return new SolverInput(requirements, slots, rooms, availability, classRules, existing, options);
    }

    static ExistingSession existing(String classId, String teacherId, String roomId, LocalDate date,
                                    int startPeriod, List<TimeSlot> slots) {
        TimeRange range = block(date, startPeriod, slots);
        return new ExistingSession(teacherId, roomId, classId, range.start(), range.end());
    }

    static TimeRange block(LocalDate date, int startPeriod, List<TimeSlot> slots) {
        List<TimeSlot> selected = slots.stream()
            .filter(slot -> slot.periodNo() == startPeriod || slot.periodNo() == startPeriod + 1)
            .toList();
        return ScheduleRules.toInstantRange(date, selected);
    }
}
