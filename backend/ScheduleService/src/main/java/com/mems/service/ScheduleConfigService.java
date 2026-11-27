package com.mems.service;

import com.mems.client.PeopleClient;
import com.mems.dto.ClassSlotRuleDto;
import com.mems.dto.ClassSlotRulesRequest;
import com.mems.dto.ClassSlotRulesResponse;
import com.mems.dto.TeacherAvailabilityDto;
import com.mems.dto.TeacherAvailabilityRequest;
import com.mems.dto.TeacherAvailabilityResponse;
import com.mems.dto.TimeSlotConfigRequest;
import com.mems.dto.TimeSlotConfigResponse;
import com.mems.dto.TimeSlotRequest;
import com.mems.dto.TimeSlotResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.ClassSlotRuleRepository;
import com.mems.repository.TeacherAvailabilityRepository;
import com.mems.repository.TimeSlotRepository;
import com.mems.schedule.ClassSlotRule;
import com.mems.schedule.TeacherAvailability;
import com.mems.schedule.TimeSlot;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/** Cấu hình lịch cấp tổ chức: tiết học, quy tắc tiết của lớp, lịch rảnh giáo viên. */
@Service
public class ScheduleConfigService {
    private final TimeSlotRepository timeSlots;
    private final ClassSlotRuleRepository classRules;
    private final TeacherAvailabilityRepository availability;
    private final PeopleClient people;

    public ScheduleConfigService(TimeSlotRepository timeSlots, ClassSlotRuleRepository classRules,
                                 TeacherAvailabilityRepository availability, PeopleClient people) {
        this.timeSlots = timeSlots;
        this.classRules = classRules;
        this.availability = availability;
        this.people = people;
    }

    @Transactional(readOnly = true)
    public TimeSlotConfigResponse listTimeSlots(String orgId) {
        return new TimeSlotConfigResponse(timeSlots.listByOrg(orgId).stream()
            .map(this::toResponse).toList());
    }

    @Transactional
    public TimeSlotConfigResponse replaceTimeSlots(String orgId, TimeSlotConfigRequest request) {
        List<TimeSlot> slots = validateTimeSlots(request == null ? null : request.slots());
        timeSlots.deleteByOrg(orgId);
        Instant now = Instant.now();
        for (TimeSlot slot : slots) timeSlots.insert(orgId, slot, now);
        return listTimeSlots(orgId);
    }

    @Transactional(readOnly = true)
    public ClassSlotRulesResponse getClassRules(String orgId, String classId) {
        requireClass(orgId, classId);
        return new ClassSlotRulesResponse(classId, classRules.listByClass(orgId, classId).stream()
            .map(this::toDto).toList());
    }

    @Transactional
    public ClassSlotRulesResponse replaceClassRules(String orgId, String classId,
                                                    ClassSlotRulesRequest request) {
        requireClass(orgId, classId);
        List<ClassSlotRule> rules = validateClassRules(orgId,
            request == null ? null : request.rules());
        classRules.deleteByClass(orgId, classId);
        Instant now = Instant.now();
        for (ClassSlotRule rule : rules) classRules.insert(orgId, classId, rule, now);
        return getClassRules(orgId, classId);
    }

    @Transactional(readOnly = true)
    public TeacherAvailabilityResponse getTeacherAvailability(String orgId, String teacherId) {
        requireTeacher(orgId, teacherId);
        return new TeacherAvailabilityResponse(teacherId, availability.listByTeacher(orgId, teacherId)
            .stream().map(this::toDto).toList());
    }

    @Transactional
    public TeacherAvailabilityResponse replaceTeacherAvailability(String orgId, String teacherId,
                                                                  TeacherAvailabilityRequest request) {
        requireTeacher(orgId, teacherId);
        List<TeacherAvailability> entries = validateAvailability(orgId,
            request == null ? null : request.entries());
        availability.deleteByTeacher(orgId, teacherId);
        Instant now = Instant.now();
        for (TeacherAvailability entry : entries) {
            availability.insert(orgId, teacherId, entry, now);
        }
        return getTeacherAvailability(orgId, teacherId);
    }

    private List<TimeSlot> validateTimeSlots(List<TimeSlotRequest> request) {
        if (request == null || request.isEmpty()) throw new AppException(ErrorCode.TIME_SLOTS_REQUIRED);
        List<TimeSlot> slots = new ArrayList<>();
        for (TimeSlotRequest item : request) {
            if (item == null || item.startTime() == null || item.endTime() == null) {
                throw invalidTimeSlot("start and end time are required");
            }
            if (!item.startTime().isBefore(item.endTime())) {
                throw invalidTimeSlot("end time must be after start time");
            }
            slots.add(new TimeSlot(null, item.periodNo(), trimToNull(item.name()),
                item.startTime(), item.endTime(),
                Boolean.TRUE.equals(item.joinsNext()),
                item.isActive() == null || item.isActive()));
        }
        slots.sort(Comparator.comparingInt(TimeSlot::periodNo));
        for (int i = 0; i < slots.size(); i++) {
            if (slots.get(i).periodNo() != i + 1) {
                throw invalidTimeSlot("period numbers must be contiguous starting at 1");
            }
        }
        for (int i = 0; i < slots.size() - 1; i++) {
            TimeSlot current = slots.get(i);
            TimeSlot next = slots.get(i + 1);
            if (current.joinsNext() && !next.start().equals(current.end())) {
                throw invalidTimeSlot("joined period " + current.periodNo() + " must end when the next starts");
            }
            if (!current.joinsNext() && next.start().isBefore(current.end())) {
                throw invalidTimeSlot("period " + next.periodNo() + " overlaps the previous period");
            }
        }
        if (slots.get(slots.size() - 1).joinsNext()) {
            throw invalidTimeSlot("the last period cannot join a next period");
        }
        return slots;
    }

    private List<ClassSlotRule> validateClassRules(String orgId, List<ClassSlotRuleDto> request) {
        if (request == null) throw new AppException(ErrorCode.CLASS_SLOT_RULE_INVALID);
        int maxPeriod = maxPeriod(orgId);
        List<ClassSlotRule> rules = new ArrayList<>();
        for (ClassSlotRuleDto item : request) {
            if (item == null || item.weekday() < 1 || item.weekday() > 7
                || item.fromPeriod() < 1 || item.toPeriod() < item.fromPeriod()
                || item.toPeriod() > maxPeriod) {
                throw new AppException(ErrorCode.CLASS_SLOT_RULE_INVALID,
                    "weekday or period range is outside the configured periods");
            }
            rules.add(new ClassSlotRule(item.weekday(), item.fromPeriod(), item.toPeriod(), item.off()));
        }
        rules.sort(Comparator.comparingInt(ClassSlotRule::weekday)
            .thenComparingInt(ClassSlotRule::fromPeriod)
            .thenComparingInt(ClassSlotRule::toPeriod));
        rejectOverlaps(rules.stream()
            .map(rule -> new Range(rule.weekday(), rule.fromPeriod(), rule.toPeriod(), rule.off()))
            .toList(), ErrorCode.CLASS_SLOT_RULE_INVALID);
        return rules;
    }

    private List<TeacherAvailability> validateAvailability(String orgId,
                                                           List<TeacherAvailabilityDto> request) {
        if (request == null) throw new AppException(ErrorCode.TEACHER_AVAILABILITY_INVALID);
        int maxPeriod = maxPeriod(orgId);
        List<TeacherAvailability> entries = new ArrayList<>();
        for (TeacherAvailabilityDto item : request) {
            if (item == null) {
                throw new AppException(ErrorCode.TEACHER_AVAILABILITY_INVALID, "entry is required");
            }
            TeacherAvailability.Kind kind = parseKind(item.kind());
            if (item.weekday() < 1 || item.weekday() > 7
                || item.fromPeriod() < 1 || item.toPeriod() < item.fromPeriod()
                || item.toPeriod() > maxPeriod) {
                throw new AppException(ErrorCode.TEACHER_AVAILABILITY_INVALID,
                    "weekday or period range is outside the configured periods");
            }
            entries.add(new TeacherAvailability(item.weekday(), item.fromPeriod(), item.toPeriod(), kind));
        }
        entries.sort(Comparator.comparingInt(TeacherAvailability::weekday)
            .thenComparingInt(TeacherAvailability::fromPeriod)
            .thenComparingInt(TeacherAvailability::toPeriod));
        rejectOverlaps(entries.stream()
            .map(entry -> new Range(entry.weekday(), entry.fromPeriod(), entry.toPeriod(),
                entry.kind() == TeacherAvailability.Kind.UNAVAILABLE))
            .toList(), ErrorCode.TEACHER_AVAILABILITY_INVALID);
        return entries;
    }

    private void rejectOverlaps(List<Range> ranges, ErrorCode errorCode) {
        for (int i = 0; i < ranges.size(); i++) {
            for (int j = i + 1; j < ranges.size(); j++) {
                Range a = ranges.get(i);
                Range b = ranges.get(j);
                if (a.weekday() == b.weekday() && a.off() == b.off()
                    && b.from() <= a.to()) {
                    throw new AppException(errorCode, "overlapping ranges of the same kind");
                }
            }
        }
    }

    private int maxPeriod(String orgId) {
        return timeSlots.listByOrg(orgId).stream()
            .mapToInt(TimeSlot::periodNo).max().orElse(0);
    }

    private void requireClass(String orgId, String classId) {
        if (classId == null || classId.isBlank() || people.classInfo(orgId, classId) == null) {
            throw new AppException(ErrorCode.CLASS_NOT_FOUND);
        }
    }

    private void requireTeacher(String orgId, String teacherId) {
        if (teacherId == null || teacherId.isBlank() || !people.teacherExists(orgId, teacherId)) {
            throw new AppException(ErrorCode.TEACHER_NOT_FOUND);
        }
    }

    private TeacherAvailability.Kind parseKind(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new AppException(ErrorCode.TEACHER_AVAILABILITY_INVALID, "kind is required");
        }
        try {
            return TeacherAvailability.Kind.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new AppException(ErrorCode.TEACHER_AVAILABILITY_INVALID,
                "kind must be AVAILABLE or UNAVAILABLE");
        }
    }

    private AppException invalidTimeSlot(String detail) {
        return new AppException(ErrorCode.TIME_SLOT_INVALID, detail);
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private TimeSlotResponse toResponse(TimeSlot slot) {
        return new TimeSlotResponse(slot.id(), slot.periodNo(), slot.name(),
            slot.start(), slot.end(), slot.joinsNext(), slot.active());
    }

    private ClassSlotRuleDto toDto(ClassSlotRule rule) {
        return new ClassSlotRuleDto(rule.weekday(), rule.fromPeriod(), rule.toPeriod(), rule.off());
    }

    private TeacherAvailabilityDto toDto(TeacherAvailability entry) {
        return new TeacherAvailabilityDto(entry.weekday(), entry.fromPeriod(), entry.toPeriod(),
            entry.kind().name());
    }

    private record Range(int weekday, int from, int to, boolean off) {
    }
}
