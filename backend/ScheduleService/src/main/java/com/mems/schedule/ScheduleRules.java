package com.mems.schedule;

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

/**
 * Hàm thuần cho quy tắc lịch: không phụ thuộc Spring/DB, dùng chung cho xếp lịch
 * tự động và kiểm tra thủ công. Mặc định không có cấu hình nghĩa là tự do.
 */
public final class ScheduleRules {
    public static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private ScheduleRules() {
    }

    /** Lớp được xếp vào tiết này không, theo quy tắc tuần (off thắng allow). */
    public static boolean isPeriodAllowedForClass(List<ClassSlotRule> rules, int weekday, int period) {
        if (rules == null || rules.isEmpty()) return true;
        boolean hasAllow = false;
        boolean allowed = false;
        boolean blocked = false;
        for (ClassSlotRule rule : rules) {
            if (rule == null || rule.weekday() != weekday) continue;
            if (rule.off()) {
                if (covers(rule.fromPeriod(), rule.toPeriod(), period)) blocked = true;
            } else {
                hasAllow = true;
                if (covers(rule.fromPeriod(), rule.toPeriod(), period)) allowed = true;
            }
        }
        if (blocked) return false;
        return !hasAllow || allowed;
    }

    /** Giáo viên rảnh vào tiết này không, theo khoảng tuần (UNAVAILABLE thắng AVAILABLE). */
    public static boolean isTeacherFree(List<TeacherAvailability> entries, int weekday, int period) {
        if (entries == null || entries.isEmpty()) return true;
        boolean hasAvailable = false;
        boolean available = false;
        boolean blocked = false;
        for (TeacherAvailability entry : entries) {
            if (entry == null || entry.weekday() != weekday) continue;
            boolean covered = covers(entry.fromPeriod(), entry.toPeriod(), period);
            if (entry.kind() == TeacherAvailability.Kind.UNAVAILABLE) {
                if (covered) blocked = true;
            } else {
                hasAvailable = true;
                if (covered) available = true;
            }
        }
        if (blocked) return false;
        return !hasAvailable || available;
    }

    /**
     * Các tiết liên tiếp cho một buổi dài sessionMinutes, tôn trọng joinsNext và
     * giờ nghỉ. Trả danh sách rỗng khi không xếp được đúng khung tiết.
     */
    public static List<Integer> sessionPeriods(List<TimeSlot> slots, int startPeriod, int sessionMinutes) {
        if (slots == null || sessionMinutes <= 0) return List.of();
        Map<Integer, TimeSlot> active = new HashMap<>();
        for (TimeSlot slot : slots) {
            if (slot != null && slot.active()) active.put(slot.periodNo(), slot);
        }
        if (!active.containsKey(startPeriod)) return List.of();

        List<Integer> periods = new ArrayList<>();
        int total = 0;
        int number = startPeriod;
        while (true) {
            TimeSlot slot = active.get(number);
            if (slot == null) return List.of();
            long minutes = Duration.between(slot.start(), slot.end()).toMinutes();
            if (minutes <= 0) return List.of();
            periods.add(number);
            total += (int) minutes;
            if (total == sessionMinutes) {
                return slot.joinsNext() ? List.of() : List.copyOf(periods);
            }
            if (total > sessionMinutes || !slot.joinsNext()) return List.of();
            TimeSlot next = active.get(number + 1);
            if (next == null || !next.start().equals(slot.end())) return List.of();
            number++;
        }
    }

    /** Quy đổi ngày + danh sách tiết sang Instant theo múi giờ Việt Nam. */
    public static TimeRange toInstantRange(LocalDate date, List<TimeSlot> periods) {
        if (date == null || periods == null || periods.isEmpty()) {
            throw new IllegalArgumentException("date and periods are required");
        }
        List<TimeSlot> sorted = periods.stream()
            .filter(slot -> slot != null && slot.active())
            .sorted(Comparator.comparingInt(TimeSlot::periodNo))
            .toList();
        if (sorted.isEmpty()) throw new IllegalArgumentException("no active periods");
        TimeSlot first = sorted.get(0);
        TimeSlot last = sorted.get(sorted.size() - 1);
        Instant start = LocalDateTime.of(date, first.start()).atZone(BUSINESS_ZONE).toInstant();
        Instant end = LocalDateTime.of(date, last.end()).atZone(BUSINESS_ZONE).toInstant();
        if (!end.isAfter(start)) throw new IllegalArgumentException("invalid period range");
        return new TimeRange(start, end);
    }

    private static boolean covers(int fromPeriod, int toPeriod, int period) {
        return fromPeriod <= period && period <= toPeriod;
    }
}
