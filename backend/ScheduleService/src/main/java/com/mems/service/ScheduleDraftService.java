package com.mems.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mems.client.EligibleTeacherInfo;
import com.mems.client.FacilityClient;
import com.mems.client.PeopleClient;
import com.mems.client.RoomInfo;
import com.mems.dto.ScheduleDraftConfirmResponse;
import com.mems.dto.ScheduleDraftDetailResponse;
import com.mems.dto.ScheduleDraftItemResponse;
import com.mems.dto.ScheduleDraftPatchRequest;
import com.mems.dto.ScheduleDraftRequest;
import com.mems.dto.ScheduleDraftSummaryResponse;
import com.mems.dto.ScheduleDraftUnscheduledResponse;
import com.mems.dto.ScheduleRequest;
import com.mems.dto.SchedulingRequirements;
import com.mems.dto.SessionRequirement;
import com.mems.dto.UnschedulableRequirement;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.ClassSlotRuleRepository;
import com.mems.repository.ScheduleDraftRepository;
import com.mems.repository.ScheduleDraftRepository.DraftRow;
import com.mems.repository.ScheduleDraftRepository.ItemRow;
import com.mems.repository.ScheduleDraftRepository.UnscheduledRow;
import com.mems.repository.TeacherAvailabilityRepository;
import com.mems.repository.TimeSlotRepository;
import com.mems.schedule.ScheduleRules;
import com.mems.schedule.TimeSlot;
import com.mems.scheduling.AutoScheduleSolver;
import com.mems.scheduling.SolverInput;
import com.mems.scheduling.SolverOptions;
import com.mems.scheduling.SolverPlacement;
import com.mems.scheduling.SolverResult;
import com.mems.scheduling.SolverRoom;
import com.mems.scheduling.SolverUnscheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Lịch nháp: chạy bộ xếp lịch thuần rồi lưu kết quả, cho phép sửa tay từng buổi và
 * chỉ ghi `session` khi người dùng xác nhận (một transaction, all-or-nothing).
 */
@Service
public class ScheduleDraftService {
    private static final ZoneId ZONE = ScheduleRules.BUSINESS_ZONE;
    private static final int DRAFT_TTL_DAYS = 7;
    private static final long SOLVER_MAX_MILLIS = SolverOptions.DEFAULT_MAX_MILLIS;
    private static final int SOLVER_MAX_STEPS = SolverOptions.DEFAULT_MAX_STEPS;
    private static final double SOLVER_MIN_COVERAGE = SolverOptions.DEFAULT_MIN_COVERAGE;

    private final ScheduleDraftRepository drafts;
    private final SchedulingRequirementBuilder builder;
    private final AutoScheduleSolver solver;
    private final TimeSlotRepository timeSlots;
    private final ClassSlotRuleRepository classRules;
    private final TeacherAvailabilityRepository availability;
    private final ScheduleService scheduleService;
    private final DraftItemValidator validator;
    private final PeopleClient people;
    private final FacilityClient facility;
    private final ObjectMapper mapper;
    private final TransactionTemplate transaction;

    public ScheduleDraftService(ScheduleDraftRepository drafts, SchedulingRequirementBuilder builder,
                                AutoScheduleSolver solver, TimeSlotRepository timeSlots,
                                ClassSlotRuleRepository classRules,
                                TeacherAvailabilityRepository availability,
                                ScheduleService scheduleService, DraftItemValidator validator,
                                PeopleClient people, FacilityClient facility, ObjectMapper mapper,
                                PlatformTransactionManager transactionManager) {
        this.drafts = drafts;
        this.builder = builder;
        this.solver = solver;
        this.timeSlots = timeSlots;
        this.classRules = classRules;
        this.availability = availability;
        this.scheduleService = scheduleService;
        this.validator = validator;
        this.people = people;
        this.facility = facility;
        this.mapper = mapper;
        this.transaction = new TransactionTemplate(transactionManager);
    }

    // ---------------------------------------------------------------- create

    @Transactional
    public ScheduleDraftDetailResponse create(String orgId, String departmentId, String userId,
                                              ScheduleDraftRequest request) {
        if (request.dateTo().isBefore(request.dateFrom())) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Khoảng ngày không hợp lệ");
        }
        List<TimeSlot> slots = timeSlots.listByOrg(orgId);
        if (slots.isEmpty()) throw new AppException(ErrorCode.SCHEDULE_CONFIG_MISSING);

        SchedulingRequirements requirements = builder.build(orgId, request.classIds(),
            request.dateFrom(), request.dateTo());
        List<SessionRequirement> items = requirements.requirements();

        List<SolverRoom> rooms = facility.roomsOfOrg(orgId).stream()
            .filter(room -> "active".equals(room.status()) && room.brokenEquipmentCount() == 0)
            .map(room -> new SolverRoom(room.id(), room.code(), room.capacity(), room.roomType()))
            .toList();

        Set<String> teacherIds = new LinkedHashSet<>();
        Set<String> classIds = new LinkedHashSet<>();
        for (SessionRequirement item : items) {
            classIds.add(item.classId());
            if (item.teacherId() != null) teacherIds.add(item.teacherId());
            item.candidateTeachers().stream().map(EligibleTeacherInfo::userId)
                .filter(Objects::nonNull).forEach(teacherIds::add);
        }
        Map<String, List<com.mems.schedule.TeacherAvailability>> teacherAvailability =
            availability.listByTeachers(orgId, teacherIds);
        Map<String, List<com.mems.schedule.ClassSlotRule>> slotRules =
            classRules.listByClasses(orgId, classIds);

        LocalDate windowFrom = items.stream().map(SessionRequirement::windowFrom)
            .min(LocalDate::compareTo).orElse(request.dateFrom());
        LocalDate windowTo = items.stream().map(SessionRequirement::windowTo)
            .max(LocalDate::compareTo).orElse(request.dateTo());
        List<com.mems.scheduling.ExistingSession> existing = scheduleService.listExistingSessions(
            orgId, windowFrom.atStartOfDay(ZONE).toInstant(),
            windowTo.plusDays(1).atStartOfDay(ZONE).toInstant());

        SolverOptions options = new SolverOptions(SOLVER_MAX_MILLIS, SOLVER_MAX_STEPS,
            SOLVER_MIN_COVERAGE, allowedWeekdays(request.sessionDays()));
        SolverResult result = solver.solve(new SolverInput(items, slots, rooms,
            teacherAvailability, slotRules, existing, options));

        LocalDate firstMonday = mondayOf(request.dateFrom());
        Map<String, String> teacherNames = teacherNames(items);
        Map<String, String> subjectNames = new HashMap<>();
        items.forEach(item -> subjectNames.put(subjectKey(item.classId(), item.subjectId()),
            item.subjectName()));
        Map<String, String> roomCodes = new HashMap<>();
        rooms.forEach(room -> roomCodes.put(room.id(), room.code()));

        String draftId = UUID.randomUUID().toString();
        List<ItemRow> itemRows = new ArrayList<>();
        for (SolverPlacement placement : result.placements()) {
            itemRows.add(new ItemRow(UUID.randomUUID().toString(), draftId, placement.classId(),
                placement.subjectId(), placement.teacherId(),
                teacherNames.get(placement.teacherId()), placement.roomId(),
                roomCodes.get(placement.roomId()),
                subjectNames.get(subjectKey(placement.classId(), placement.subjectId())),
                placement.start(), placement.end(),
                weekOf(placement.date(), firstMonday), placement.isException(),
                placement.exceptionType(), placement.exceptionReason(), false));
        }
        List<UnscheduledRow> unscheduledRows = new ArrayList<>();
        for (UnschedulableRequirement blocked : requirements.unschedulable()) {
            unscheduledRows.add(new UnscheduledRow(UUID.randomUUID().toString(),
                blocked.classId(), blocked.subjectId(), null,
                nonBlank(blocked.reason(), "Không xếp được môn học")));
        }
        for (SolverUnscheduled failed : result.unscheduled()) {
            unscheduledRows.add(new UnscheduledRow(UUID.randomUUID().toString(),
                failed.classId(), failed.subjectId(), failed.sessionNo(),
                nonBlank(failed.reason(), "Không xếp được buổi học")));
        }

        DraftParams params = new DraftParams(List.copyOf(new LinkedHashSet<>(request.classIds())),
            request.dateFrom(), request.dateTo(), request.sessionDays());
        DraftSummary summary = new DraftSummary(itemRows.size(), unscheduledRows.size(),
            result.stats().exceptionCount(), result.stats().complete(), result.stats().steps(),
            result.stats().elapsedMillis(), totalWeeks(request.dateFrom(), request.dateTo()));

        drafts.insertDraft(draftId, orgId, departmentId, toJson(params), toJson(summary),
            userId, Instant.now());
        itemRows.forEach(drafts::insertItem);
        unscheduledRows.forEach(row -> drafts.insertUnscheduled(row.id(), draftId, row.classId(),
            row.subjectId(), row.sessionNo(), row.reason()));

        return detail(orgId, departmentId, draftId, 1);
    }

    // ------------------------------------------------------------------ read

    @Transactional(readOnly = true)
    public List<ScheduleDraftSummaryResponse> list(String orgId, String departmentId, String status) {
        List<ScheduleDraftSummaryResponse> result = new ArrayList<>();
        for (DraftRow row : drafts.listDrafts(orgId, departmentId, status)) {
            DraftParams params = readParams(row.params());
            DraftSummary summary = readSummary(row.summary());
            result.add(new ScheduleDraftSummaryResponse(row.id(), row.status(),
                row.departmentId(), params.classIds(), params.dateFrom(), params.dateTo(),
                summary == null ? 0 : summary.itemCount(),
                summary == null ? 0 : summary.unscheduledCount(),
                summary == null ? 0 : summary.exceptionCount(),
                row.createdAt(), row.confirmedAt()));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public ScheduleDraftDetailResponse detail(String orgId, String departmentId, String draftId,
                                              int week) {
        DraftRow row = drafts.findDraft(orgId, departmentId, draftId);
        if (row == null) throw new AppException(ErrorCode.SCHEDULE_DRAFT_NOT_FOUND);
        DraftParams params = readParams(row.params());
        DraftSummary summary = readSummary(row.summary());
        int totalWeeks = Math.max(1, summary == null
            ? totalWeeks(params.dateFrom(), params.dateTo()) : summary.totalWeeks());
        int currentWeek = Math.max(1, Math.min(week <= 0 ? 1 : week, totalWeeks));

        List<TimeSlot> slots = timeSlots.listByOrg(orgId);
        List<ItemRow> all = drafts.listItems(orgId, draftId);
        List<ScheduleDraftItemResponse> items = new ArrayList<>();
        for (ItemRow item : all) {
            if (item.weekNo() != currentWeek) continue;
            items.add(new ScheduleDraftItemResponse(item.id(), item.classId(), item.subjectId(),
                item.subjectName(), item.teacherId(), item.teacherName(), item.roomId(),
                item.roomCode(), item.start(), item.end(),
                item.start().atZone(ZONE).toLocalDate(), periodsOf(item.start(), item.end(), slots),
                item.weekNo(), item.exception(), item.exceptionType(), item.exceptionReason(),
                item.manualEdit()));
        }
        List<ScheduleDraftUnscheduledResponse> unscheduled = drafts.listUnscheduled(orgId, draftId)
            .stream()
            .map(rowItem -> new ScheduleDraftUnscheduledResponse(rowItem.id(), rowItem.classId(),
                rowItem.subjectId(), rowItem.sessionNo(), rowItem.reason()))
            .toList();
        int exceptionCount = (int) all.stream().filter(ItemRow::exception).count();
        return new ScheduleDraftDetailResponse(row.id(), row.status(), row.departmentId(),
            params.classIds(), params.dateFrom(), params.dateTo(), currentWeek, totalWeeks,
            items, unscheduled, all.size(), exceptionCount, unscheduled.size(),
            summary != null && summary.complete(), summary == null ? 0 : summary.steps(),
            summary == null ? 0 : summary.elapsedMillis(), row.createdAt(), row.confirmedAt());
    }

    // ----------------------------------------------------------------- patch

    @Transactional
    public ScheduleDraftItemResponse patchItem(String orgId, String departmentId, String draftId,
                                               String itemId, ScheduleDraftPatchRequest request) {
        DraftRow draft = drafts.findDraft(orgId, departmentId, draftId);
        if (draft == null) throw new AppException(ErrorCode.SCHEDULE_DRAFT_NOT_FOUND);
        if (!"DRAFT".equals(draft.status())) {
            throw new AppException(ErrorCode.SCHEDULE_DRAFT_NOT_EDITABLE);
        }
        ItemRow item = drafts.findItem(orgId, draftId, itemId);
        if (item == null) throw new AppException(ErrorCode.SCHEDULE_DRAFT_ITEM_NOT_FOUND);

        boolean hasStart = request.startTime() != null;
        boolean hasEnd = request.endTime() != null;
        if (hasStart != hasEnd) {
            throw new AppException(ErrorCode.INVALID_TIME_RANGE,
                "Phải gửi cả giờ bắt đầu và giờ kết thúc");
        }
        Instant start = hasStart ? request.startTime() : item.start();
        Instant end = hasEnd ? request.endTime() : item.end();
        String roomId = request.roomId() == null ? item.roomId() : blankToNull(request.roomId());
        String teacherId = request.teacherId() == null ? item.teacherId()
            : blankToNull(request.teacherId());
        String teacherName = item.teacherName();
        if (request.teacherId() != null) {
            if (teacherId == null) {
                teacherName = null;
            } else {
                EligibleTeacherInfo teacher = people.teacherInfo(orgId, teacherId);
                if (teacher == null) throw new AppException(ErrorCode.TEACHER_NOT_FOUND);
                requireEligible(orgId, item.subjectId(), teacherId);
                teacherName = teacher.fullName();
            }
        }

        List<ItemRow> others = drafts.listItems(orgId, draftId).stream()
            .filter(other -> !other.id().equals(itemId)).toList();
        validator.validate(orgId, item.classId(), item.subjectId(), teacherId, roomId,
            start, end, others);

        drafts.updateItem(orgId, draftId, itemId, roomId, roomCode(orgId, roomId), teacherId,
            teacherName, start, end);
        ItemRow updated = drafts.findItem(orgId, draftId, itemId);
        List<TimeSlot> slots = timeSlots.listByOrg(orgId);
        return new ScheduleDraftItemResponse(updated.id(), updated.classId(), updated.subjectId(),
            updated.subjectName(), updated.teacherId(), updated.teacherName(), updated.roomId(),
            updated.roomCode(), updated.start(), updated.end(),
            updated.start().atZone(ZONE).toLocalDate(),
            periodsOf(updated.start(), updated.end(), slots), updated.weekNo(),
            updated.exception(), updated.exceptionType(), updated.exceptionReason(),
            updated.manualEdit());
    }

    // --------------------------------------------------------------- confirm

    public ScheduleDraftConfirmResponse confirm(String orgId, String departmentId, String draftId) {
        ScheduleDraftConfirmResponse response = transaction.execute(status -> {
            DraftRow draft = drafts.lockDraft(orgId, departmentId, draftId);
            if (draft == null) throw new AppException(ErrorCode.SCHEDULE_DRAFT_NOT_FOUND);
            if (!"DRAFT".equals(draft.status())) {
                throw new AppException(ErrorCode.SCHEDULE_DRAFT_NOT_EDITABLE);
            }
            if (Instant.now().isAfter(draft.createdAt().plus(DRAFT_TTL_DAYS, ChronoUnit.DAYS))) {
                throw new AppException(ErrorCode.SCHEDULE_DRAFT_EXPIRED);
            }
            List<ItemRow> items = drafts.listItems(orgId, draftId);
            if (items.isEmpty()) {
                throw new AppException(ErrorCode.SCHEDULE_DRAFT_CONFIRM_FAILED,
                    "Lịch nháp không có buổi nào để xác nhận");
            }
            List<ScheduleDraftConfirmResponse.FailedItem> failed = new ArrayList<>();
            int created = 0;
            for (ItemRow item : items) {
                try {
                    scheduleService.create(orgId, departmentId, new ScheduleRequest(
                        item.classId(), item.teacherId(), item.teacherName(), item.subjectName(),
                        item.roomId(), item.start(), item.end(), item.subjectId()));
                    created++;
                } catch (RuntimeException ex) {
                    failed.add(new ScheduleDraftConfirmResponse.FailedItem(item.id(), item.classId(),
                        item.subjectName(), confirmReason(ex)));
                }
            }
            if (!failed.isEmpty()) {
                status.setRollbackOnly();
                return new ScheduleDraftConfirmResponse(0, failed);
            }
            drafts.markConfirmed(orgId, draftId, Instant.now());
            return new ScheduleDraftConfirmResponse(created, List.of());
        });
        return response == null ? new ScheduleDraftConfirmResponse(0, List.of()) : response;
    }

    // --------------------------------------------------------------- discard

    @Transactional
    public void discard(String orgId, String departmentId, String draftId) {
        DraftRow draft = drafts.lockDraft(orgId, departmentId, draftId);
        if (draft == null) throw new AppException(ErrorCode.SCHEDULE_DRAFT_NOT_FOUND);
        if (!"DRAFT".equals(draft.status())) {
            throw new AppException(ErrorCode.SCHEDULE_DRAFT_NOT_EDITABLE);
        }
        drafts.markDiscarded(orgId, draftId, Instant.now());
    }

    // --------------------------------------------------------------- helpers

    private void requireEligible(String orgId, String subjectId, String teacherId) {
        if (subjectId == null || subjectId.isBlank()) return;
        boolean eligible = people.eligibleTeachers(orgId, subjectId).stream()
            .anyMatch(teacher -> teacherId.equals(teacher.userId()));
        if (!eligible) {
            throw new AppException(ErrorCode.SCHEDULE_DRAFT_ITEM_CONFLICT,
                "Giáo viên không đủ điều kiện dạy môn này");
        }
    }

    private String roomCode(String orgId, String roomId) {
        if (roomId == null || roomId.isBlank()) return null;
        RoomInfo room = facility.room(orgId, roomId);
        return room == null ? null : room.code();
    }

    private List<Integer> periodsOf(Instant start, Instant end, List<TimeSlot> slots) {
        java.time.LocalTime local = start.atZone(ZONE).toLocalTime();
        int startPeriod = slots.stream()
            .filter(slot -> slot.active() && slot.start().equals(local))
            .mapToInt(TimeSlot::periodNo).findFirst().orElse(-1);
        if (startPeriod < 0) return List.of();
        int minutes = (int) Duration.between(start, end).toMinutes();
        return ScheduleRules.sessionPeriods(slots, startPeriod, minutes);
    }

    private Map<String, String> teacherNames(List<SessionRequirement> requirements) {
        Map<String, String> names = new HashMap<>();
        for (SessionRequirement item : requirements) {
            for (EligibleTeacherInfo teacher : item.candidateTeachers()) {
                if (teacher.userId() != null && teacher.fullName() != null) {
                    names.putIfAbsent(teacher.userId(), teacher.fullName());
                }
            }
        }
        return names;
    }

    private Set<Integer> allowedWeekdays(List<Integer> sessionDays) {
        if (sessionDays == null) return Set.of();
        Set<Integer> days = new LinkedHashSet<>();
        for (Integer day : sessionDays) {
            if (day != null && day >= 1 && day <= 7) days.add(day);
        }
        return days;
    }

    private String confirmReason(Throwable ex) {
        if (ex instanceof AppException app) {
            return switch (app.getErrorCode()) {
                case TEACHER_SCHEDULE_CONFLICT -> "Giáo viên đã có lịch trong khung giờ này";
                case ROOM_SCHEDULE_CONFLICT -> "Phòng đã được đặt trong khung giờ này";
                case CLASS_SCHEDULE_CONFLICT -> "Lớp đã có buổi học trong khung giờ này";
                case ROOM_NOT_AVAILABLE -> "Phòng không khả dụng hoặc không đủ chỗ";
                case ROOM_TYPE_MISMATCH -> "Môn này cần phòng máy";
                case CLASS_NOT_SCHEDULABLE -> "Lớp đã đóng hoặc đã kết thúc";
                case CLASS_NOT_FOUND -> "Lớp không còn tồn tại";
                case INVALID_TIME_RANGE -> "Khung giờ không hợp lệ";
                default -> app.getMessage();
            };
        }
        return "Không tạo được buổi học";
    }

    private int weekOf(LocalDate date, LocalDate firstMonday) {
        long weeks = ChronoUnit.WEEKS.between(firstMonday, mondayOf(date));
        return (int) weeks + 1;
    }

    private int totalWeeks(LocalDate from, LocalDate to) {
        return (int) ChronoUnit.WEEKS.between(mondayOf(from), mondayOf(to)) + 1;
    }

    private LocalDate mondayOf(LocalDate date) {
        return date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    private String subjectKey(String classId, String subjectId) {
        return classId + "|" + subjectId;
    }

    private String nonBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String toJson(Object value) {
        try {
            return mapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "Không lưu được lịch nháp");
        }
    }

    private DraftParams readParams(String json) {
        try {
            return mapper.readValue(json, DraftParams.class);
        } catch (JsonProcessingException ex) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "Lịch nháp bị hỏng dữ liệu");
        }
    }

    private DraftSummary readSummary(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return mapper.readValue(json, DraftSummary.class);
        } catch (JsonProcessingException ex) {
            return null;
        }
    }

    public record DraftParams(List<String> classIds, LocalDate dateFrom, LocalDate dateTo,
                              List<Integer> sessionDays) {}

    public record DraftSummary(int itemCount, int unscheduledCount, int exceptionCount,
                               boolean complete, long steps, long elapsedMillis, int totalWeeks) {}
}
