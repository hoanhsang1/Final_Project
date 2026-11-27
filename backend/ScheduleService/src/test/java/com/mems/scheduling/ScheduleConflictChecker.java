package com.mems.scheduling;

import com.mems.dto.SessionRequirement;
import com.mems.schedule.ClassSlotRule;
import com.mems.schedule.TeacherAvailability;
import com.mems.schedule.TimeSlot;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Bộ kiểm tra độc lập: tự cài lại các quy tắc cứng (không dùng code nội bộ của
 * bộ xếp lịch) để xác nhận kết quả không trùng giáo viên/phòng/lớp.
 */
final class ScheduleConflictChecker {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private ScheduleConflictChecker() {
    }

    static void verify(SolverInput input, SolverResult result) {
        Map<String, SessionRequirement> requirements = new HashMap<>();
        for (SessionRequirement requirement : input.requirements()) {
            requirements.put(key(requirement.classId(), requirement.subjectId()), requirement);
        }

        List<SolverPlacement> placements = result.placements();
        for (SolverPlacement placement : placements) {
            SessionRequirement requirement = requirements.get(key(placement.classId(), placement.subjectId()));
            assertThat(requirement).as("buổi xếp phải thuộc yêu cầu đã biết: %s/%s",
                placement.classId(), placement.subjectId()).isNotNull();
            verifySingle(input, requirement, placement);
        }

        for (int first = 0; first < placements.size(); first++) {
            for (int second = first + 1; second < placements.size(); second++) {
                SolverPlacement a = placements.get(first);
                SolverPlacement b = placements.get(second);
                if (!overlaps(a.start(), a.end(), b.start(), b.end())) continue;
                if (a.teacherId() != null && a.teacherId().equals(b.teacherId())) {
                    fail("Giáo viên %s bị trùng giờ giữa %s và %s", a.teacherId(), describe(a), describe(b));
                }
                if (a.roomId().equals(b.roomId())) {
                    fail("Phòng %s bị trùng giờ giữa %s và %s", a.roomId(), describe(a), describe(b));
                }
                if (a.classId().equals(b.classId())) {
                    fail("Lớp %s bị trùng giờ giữa %s và %s", a.classId(), describe(a), describe(b));
                }
            }
        }

        for (SolverPlacement placement : placements) {
            for (ExistingSession existing : input.existingSessions()) {
                if (!overlaps(placement.start(), placement.end(), existing.start(), existing.end())) continue;
                if (placement.teacherId() != null && placement.teacherId().equals(existing.teacherId())) {
                    fail("Giáo viên %s trùng với buổi đã có của lớp %s",
                        placement.teacherId(), existing.classId());
                }
                if (placement.roomId().equals(existing.roomId())) {
                    fail("Phòng %s trùng với buổi đã có của lớp %s", placement.roomId(), existing.classId());
                }
                if (placement.classId().equals(existing.classId())) {
                    fail("Lớp %s trùng với buổi đã có của chính lớp", placement.classId());
                }
            }
        }

        Map<String, Integer> sameDay = new HashMap<>();
        for (SolverPlacement placement : placements) {
            String dayKey = placement.classId() + "|" + placement.subjectId() + "|" + placement.date();
            int count = sameDay.merge(dayKey, 1, Integer::sum);
            assertThat(count).as("môn %s của lớp %s không được có 2 buổi cùng ngày %s",
                placement.subjectId(), placement.classId(), placement.date()).isEqualTo(1);
        }

        for (SolverUnscheduled entry : result.unscheduled()) {
            assertThat(entry.reason()).as("lý do bỏ buổi phải có nội dung").isNotBlank();
        }
    }

    private static void verifySingle(SolverInput input, SessionRequirement requirement,
                                     SolverPlacement placement) {
        LocalDate date = placement.date();
        assertThat(date).as("ngày nằm trong cửa sổ yêu cầu")
            .isBetween(requirement.windowFrom(), requirement.windowTo());
        int weekday = date.getDayOfWeek().getValue();
        assertThat(periodChain(placement.periods(), input.slots(), requirement.sessionMinutes()))
            .as("chuỗi tiết hợp lệ cho buổi %d phút", requirement.sessionMinutes()).isTrue();

        TimeSlot first = slotOf(input.slots(), placement.periods().get(0));
        TimeSlot last = slotOf(input.slots(), placement.periods().get(placement.periods().size() - 1));
        Instant expectedStart = LocalDateTime.of(date, first.start()).atZone(ZONE).toInstant();
        Instant expectedEnd = LocalDateTime.of(date, last.end()).atZone(ZONE).toInstant();
        assertThat(placement.start()).as("giờ bắt đầu theo múi giờ Việt Nam").isEqualTo(expectedStart);
        assertThat(placement.end()).as("giờ kết thúc theo múi giờ Việt Nam").isEqualTo(expectedEnd);

        for (Integer period : placement.periods()) {
            assertThat(ruleAllows(input.classSlotRules(), requirement.classId(), weekday, period))
                .as("lớp %s được xếp thứ %d tiết %d", requirement.classId(), weekday, period).isTrue();
        }
        if (placement.teacherId() != null) {
            for (Integer period : placement.periods()) {
                assertThat(availabilityAllows(input.teacherAvailability(), placement.teacherId(), weekday, period))
                    .as("giáo viên %s rảnh thứ %d tiết %d",
                        placement.teacherId(), weekday, period).isTrue();
            }
        }

        SolverRoom room = roomOf(input.rooms(), placement.roomId());
        assertThat(room).as("phòng %s phải tồn tại", placement.roomId()).isNotNull();
        assertThat(room.capacity()).as("phòng %s đủ chỗ cho %d học sinh",
            room.id(), requirement.studentCount()).isGreaterThanOrEqualTo(requirement.studentCount());
        if ("COMPUTER".equalsIgnoreCase(requirement.roomRequirement())) {
            assertThat(room.isComputerRoom()).as("môn %s phải ở phòng máy", requirement.subjectId()).isTrue();
        }
    }

    private static boolean periodChain(List<Integer> periods, List<TimeSlot> slots, int sessionMinutes) {
        if (periods == null || periods.isEmpty()) return false;
        List<Integer> sorted = new ArrayList<>(periods);
        sorted.sort(Comparator.naturalOrder());
        if (!sorted.equals(periods)) return false;

        Map<Integer, TimeSlot> active = new HashMap<>();
        for (TimeSlot slot : slots) {
            if (slot != null && slot.active()) active.put(slot.periodNo(), slot);
        }
        int total = 0;
        for (int index = 0; index < periods.size(); index++) {
            TimeSlot slot = active.get(periods.get(index));
            if (slot == null) return false;
            total += Duration.between(slot.start(), slot.end()).toMinutes();
            if (index + 1 < periods.size()) {
                TimeSlot next = active.get(periods.get(index) + 1);
                if (next == null || !next.start().equals(slot.end()) || !slot.joinsNext()) return false;
            } else if (slot.joinsNext()) {
                return false;
            }
        }
        return total == sessionMinutes;
    }

    private static boolean ruleAllows(Map<String, List<ClassSlotRule>> rules, String classId,
                                      int weekday, int period) {
        List<ClassSlotRule> entries = rules.getOrDefault(classId, List.of());
        boolean hasAllow = false;
        boolean allowed = false;
        boolean blocked = false;
        for (ClassSlotRule rule : entries) {
            if (rule.weekday() != weekday) continue;
            boolean covers = rule.fromPeriod() <= period && period <= rule.toPeriod();
            if (rule.off()) {
                if (covers) blocked = true;
            } else {
                hasAllow = true;
                if (covers) allowed = true;
            }
        }
        return !blocked && (!hasAllow || allowed);
    }

    private static boolean availabilityAllows(Map<String, List<TeacherAvailability>> availability,
                                              String teacherId, int weekday, int period) {
        List<TeacherAvailability> entries = availability.getOrDefault(teacherId, List.of());
        boolean hasAvailable = false;
        boolean available = false;
        boolean blocked = false;
        for (TeacherAvailability entry : entries) {
            if (entry.weekday() != weekday) continue;
            boolean covers = entry.fromPeriod() <= period && period <= entry.toPeriod();
            if (entry.kind() == TeacherAvailability.Kind.UNAVAILABLE) {
                if (covers) blocked = true;
            } else {
                hasAvailable = true;
                if (covers) available = true;
            }
        }
        return !blocked && (!hasAvailable || available);
    }

    private static boolean overlaps(Instant aStart, Instant aEnd, Instant bStart, Instant bEnd) {
        return aStart.isBefore(bEnd) && bStart.isBefore(aEnd);
    }

    private static TimeSlot slotOf(List<TimeSlot> slots, int periodNo) {
        for (TimeSlot slot : slots) {
            if (slot.periodNo() == periodNo) return slot;
        }
        throw new AssertionError("Không tìm thấy tiết " + periodNo);
    }

    private static SolverRoom roomOf(List<SolverRoom> rooms, String roomId) {
        for (SolverRoom room : rooms) {
            if (room.id().equals(roomId)) return room;
        }
        return null;
    }

    private static String key(String classId, String subjectId) {
        return classId + "|" + subjectId;
    }

    private static String describe(SolverPlacement placement) {
        return placement.classId() + "/" + placement.subjectId() + " ngày " + placement.date()
            + " tiết " + placement.periods();
    }

    private static void fail(String format, Object... args) {
        throw new AssertionError(String.format(format, args));
    }
}
