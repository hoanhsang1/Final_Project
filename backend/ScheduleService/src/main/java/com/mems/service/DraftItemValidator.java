package com.mems.service;

import com.mems.client.ClassInfo;
import com.mems.client.ClassSubjectInfo;
import com.mems.client.PeopleClient;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.ClassSlotRuleRepository;
import com.mems.repository.ScheduleDraftRepository.ItemRow;
import com.mems.repository.TeacherAvailabilityRepository;
import com.mems.repository.TimeSlotRepository;
import com.mems.schedule.ClassSlotRule;
import com.mems.schedule.ScheduleRules;
import com.mems.schedule.TeacherAvailability;
import com.mems.schedule.TimeRange;
import com.mems.schedule.TimeSlot;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Kiểm tra ràng buộc cứng cho một buổi sửa tay trong lịch nháp: chuỗi tiết,
 * quy tắc lớp, lịch rảnh giáo viên, phòng và trùng với buổi thật / buổi nháp khác.
 */
@Component
public class DraftItemValidator {
    private static final ZoneId ZONE = ScheduleRules.BUSINESS_ZONE;

    private final TimeSlotRepository timeSlots;
    private final ClassSlotRuleRepository classRules;
    private final TeacherAvailabilityRepository availability;
    private final ScheduleService scheduleService;
    private final PeopleClient people;

    public DraftItemValidator(TimeSlotRepository timeSlots, ClassSlotRuleRepository classRules,
                              TeacherAvailabilityRepository availability,
                              ScheduleService scheduleService, PeopleClient people) {
        this.timeSlots = timeSlots;
        this.classRules = classRules;
        this.availability = availability;
        this.scheduleService = scheduleService;
        this.people = people;
    }

    /**
     * Nem {@link AppException} khi buổi không hợp lệ. {@code otherItems} là các buổi
     * khác trong cùng draft (đã loại buổi đang sửa).
     */
    public void validate(String orgId, String classId, String subjectId, String teacherId,
                         String roomId, Instant start, Instant end,
                         List<ItemRow> otherItems) {
        if (start == null || end == null || !end.isAfter(start)) {
            throw new AppException(ErrorCode.INVALID_TIME_RANGE);
        }
        ClassInfo info = requireSchedulableClass(orgId, classId);
        if (info.studentCount() > 0 && roomId == null) {
            throw new AppException(ErrorCode.SCHEDULE_DRAFT_ITEM_CONFLICT,
                "Buổi học cần có phòng");
        }

        List<TimeSlot> slots = timeSlots.listByOrg(orgId);
        LocalDate date = start.atZone(ZONE).toLocalDate();
        if (!end.atZone(ZONE).toLocalDate().equals(date)) {
            throw itemConflict("Buổi học phải nằm trong một ngày");
        }
        int weekday = date.getDayOfWeek().getValue();
        int startPeriod = startPeriodOf(slots, start);
        int minutes = (int) Duration.between(start, end).toMinutes();
        List<Integer> periods = ScheduleRules.sessionPeriods(slots, startPeriod, minutes);
        if (periods.isEmpty()) {
            throw itemConflict("Khung giờ không khớp chuỗi tiết đã cấu hình");
        }
        List<TimeSlot> selected = new ArrayList<>();
        for (Integer period : periods) {
            for (TimeSlot slot : slots) {
                if (slot.active() && slot.periodNo() == period) selected.add(slot);
            }
        }
        TimeRange range;
        try {
            range = ScheduleRules.toInstantRange(date, selected);
        } catch (IllegalArgumentException ex) {
            throw itemConflict("Khung giờ không khớp chuỗi tiết đã cấu hình");
        }
        if (!range.start().equals(start) || !range.end().equals(end)) {
            throw itemConflict("Khung giờ không khớp chuỗi tiết đã cấu hình");
        }

        List<ClassSlotRule> rules = classRules.listByClass(orgId, classId);
        for (Integer period : periods) {
            if (!ScheduleRules.isPeriodAllowedForClass(rules, weekday, period)) {
                throw itemConflict("Lớp nghỉ tiết " + period + " vào " + weekdayName(weekday));
            }
        }
        List<TeacherAvailability> free = teacherId == null ? List.of()
            : availability.listByTeacher(orgId, teacherId);
        for (Integer period : periods) {
            if (!ScheduleRules.isTeacherFree(free, weekday, period)) {
                throw itemConflict("Giáo viên không rảnh tiết " + period + " vào "
                    + weekdayName(weekday));
            }
        }

        scheduleService.validateRoom(orgId, info, roomId, roomRequirement(orgId, classId, subjectId));
        scheduleService.assertNoConflicts(orgId, teacherId, roomId, classId, start, end, null);
        assertNoDraftConflict(otherItems, classId, subjectId, teacherId, roomId,
            start, end, date);
    }

    private void assertNoDraftConflict(List<ItemRow> otherItems, String classId, String subjectId,
                                       String teacherId, String roomId, Instant start,
                                       Instant end, LocalDate date) {
        if (otherItems == null) return;
        for (ItemRow other : otherItems) {
            boolean overlap = start.isBefore(other.end()) && other.start().isBefore(end);
            if (overlap && teacherId != null && Objects.equals(teacherId, other.teacherId())) {
                throw itemConflict("Giáo viên đã có buổi khác trong lịch nháp");
            }
            if (overlap && roomId != null && Objects.equals(roomId, other.roomId())) {
                throw itemConflict("Phòng đã có buổi khác trong lịch nháp");
            }
            if (overlap && Objects.equals(classId, other.classId())) {
                throw itemConflict("Lớp đã có buổi khác trong lịch nháp");
            }
            if (Objects.equals(classId, other.classId())
                && Objects.equals(subjectId, other.subjectId())
                && other.start().atZone(ZONE).toLocalDate().equals(date)) {
                throw itemConflict("Môn này đã có buổi trong ngày " + date);
            }
        }
    }

    private int startPeriodOf(List<TimeSlot> slots, Instant start) {
        java.time.LocalTime local = start.atZone(ZONE).toLocalTime();
        for (TimeSlot slot : slots) {
            if (slot.active() && slot.start().equals(local)) return slot.periodNo();
        }
        throw itemConflict("Giờ bắt đầu không trùng tiết học nào");
    }

    private ClassInfo requireSchedulableClass(String orgId, String classId) {
        ClassInfo info = people.classInfo(orgId, classId);
        if (info == null) throw new AppException(ErrorCode.CLASS_NOT_FOUND);
        if ("DA_HUY".equals(info.status()) || "DA_KET_THUC".equals(info.status())
            || (info.closeState() != null && !"NONE".equals(info.closeState()))) {
            throw new AppException(ErrorCode.CLASS_NOT_SCHEDULABLE);
        }
        return info;
    }

    private String roomRequirement(String orgId, String classId, String subjectId) {
        if (subjectId == null || subjectId.isBlank()) return null;
        return people.classSubjects(orgId, classId).stream()
            .filter(item -> subjectId.equals(item.subjectId()))
            .map(ClassSubjectInfo::roomRequirement)
            .filter(Objects::nonNull)
            .findFirst()
            .orElse(null);
    }

    private String weekdayName(int weekday) {
        return switch (weekday) {
            case 1 -> "Thứ 2";
            case 2 -> "Thứ 3";
            case 3 -> "Thứ 4";
            case 4 -> "Thứ 5";
            case 5 -> "Thứ 6";
            case 6 -> "Thứ 7";
            default -> "Chủ nhật";
        };
    }

    private AppException itemConflict(String message) {
        return new AppException(ErrorCode.SCHEDULE_DRAFT_ITEM_CONFLICT, message);
    }
}
