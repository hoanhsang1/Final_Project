package com.mems.service;

import com.mems.client.ClassInfo;
import com.mems.client.ClassSubjectInfo;
import com.mems.client.EligibleTeacherInfo;
import com.mems.client.PeopleClient;
import com.mems.dto.SchedulingRequirements;
import com.mems.dto.SessionRequirement;
import com.mems.dto.UnschedulableRequirement;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

/**
 * Dựng danh sách yêu cầu xếp lịch từ chương trình lớp: mỗi môn còn thiếu buổi
 * thành một {@link SessionRequirement} kèm cửa sổ ngày theo giai đoạn; môn/lớp
 * không xếp được ghi vào danh sách riêng với lý do. Một môn lỗi không làm hỏng cả lượt.
 */
@Service
public class SchedulingRequirementBuilder {

    private static final int DEFAULT_SESSIONS_PER_WEEK = 2;
    private static final int DEFAULT_SESSION_MINUTES = 90;
    private static final int DEFAULT_STAGE_NO = 1;

    private final PeopleClient people;
    private final ScheduleService scheduleService;

    public SchedulingRequirementBuilder(PeopleClient people, ScheduleService scheduleService) {
        this.people = people;
        this.scheduleService = scheduleService;
    }

    public SchedulingRequirements build(String orgId, List<String> classIds, LocalDate dateFrom,
                                       LocalDate dateTo) {
        List<SessionRequirement> requirements = new ArrayList<>();
        List<UnschedulableRequirement> unschedulable = new ArrayList<>();
        if (classIds == null || classIds.isEmpty()) {
            return new SchedulingRequirements(requirements, unschedulable);
        }
        for (String classId : new LinkedHashSet<>(classIds)) {
            if (classId == null || classId.isBlank()) continue;
            buildClass(orgId, classId, dateFrom, dateTo, requirements, unschedulable);
        }
        return new SchedulingRequirements(requirements, unschedulable);
    }

    private void buildClass(String orgId, String classId, LocalDate dateFrom, LocalDate dateTo,
                            List<SessionRequirement> requirements,
                            List<UnschedulableRequirement> unschedulable) {
        ClassInfo info = people.classInfo(orgId, classId);
        if (info == null) {
            unschedulable.add(new UnschedulableRequirement(classId, null, null, null,
                "CLASS_NOT_FOUND", "Lớp không tồn tại trong tổ chức"));
            return;
        }
        String blocked = classBlockCode(info);
        if (blocked != null) {
            unschedulable.add(entry(info, null, blocked, classBlockReason(blocked)));
            return;
        }

        List<ClassSubjectInfo> subjects = people.classSubjects(orgId, classId);
        if (subjects == null || subjects.isEmpty()) {
            unschedulable.add(entry(info, null, "NO_SUBJECTS",
                "Lớp chưa có môn học trong chương trình"));
            return;
        }

        List<SubjectPlan> plans = new ArrayList<>();
        Set<String> needTeachers = new LinkedHashSet<>();
        for (ClassSubjectInfo subject : subjects) {
            SubjectPlan plan = planSubject(orgId, info, subject, unschedulable);
            if (plan == null) continue;
            if (!plan.assigned()) needTeachers.add(subject.subjectId());
            plans.add(plan);
        }
        if (plans.isEmpty()) return;

        TeacherPool pool = loadTeacherPool(orgId, needTeachers);
        List<Accepted> accepted = new ArrayList<>();
        for (SubjectPlan plan : plans) {
            ClassSubjectInfo subject = plan.subject();
            List<EligibleTeacherInfo> candidates;
            String teacherId = null;
            if (plan.assigned()) {
                teacherId = subject.teacherId();
                candidates = List.of(new EligibleTeacherInfo(teacherId, subject.teacherName(), null));
            } else {
                candidates = pool.bySubject().getOrDefault(subject.subjectId(), List.of());
                if (candidates.isEmpty()) {
                    boolean lookupFailed = pool.failed();
                    unschedulable.add(entry(info, subject,
                        lookupFailed ? "ELIGIBILITY_LOOKUP_FAILED" : "NO_ELIGIBLE_TEACHER",
                        lookupFailed
                            ? "Không tra được giáo viên đủ điều kiện cho môn " + subjectName(subject)
                            : "Không có giáo viên đủ điều kiện dạy môn " + subjectName(subject)));
                    continue;
                }
            }
            accepted.add(new Accepted(plan, teacherId, candidates));
        }
        if (accepted.isEmpty()) return;

        LocalDate cursor = info.startDate() != null ? info.startDate()
            : dateFrom != null ? dateFrom : LocalDate.now();
        Map<Integer, List<Accepted>> byStage = new TreeMap<>();
        accepted.forEach(a -> byStage
            .computeIfAbsent(stageNo(a.plan().subject()), key -> new ArrayList<>()).add(a));

        for (Map.Entry<Integer, List<Accepted>> stage : byStage.entrySet()) {
            int weeks = stage.getValue().stream()
                .mapToInt(a -> ceilDiv(a.plan().needed(), a.plan().perWeek()))
                .max().orElse(0);
            LocalDate stageStart = cursor;
            LocalDate stageEnd = stageStart.plusWeeks(weeks).minusDays(1);
            cursor = stageStart.plusWeeks(weeks);

            for (Accepted acceptedItem : stage.getValue()) {
                SessionRequirement requirement = windowRequirement(info, acceptedItem, stage.getKey(),
                    stageStart, stageEnd, dateFrom, dateTo, unschedulable);
                if (requirement != null) requirements.add(requirement);
            }
        }
    }

    /** Trả `null` khi môn đã đủ buổi; trả plan khi còn phải xếp; ghi lý do khi môn lỗi. */
    private SubjectPlan planSubject(String orgId, ClassInfo info, ClassSubjectInfo subject,
                                    List<UnschedulableRequirement> unschedulable) {
        if (subject == null || subject.subjectId() == null || subject.subjectId().isBlank()) {
            unschedulable.add(entry(info, subject, "SUBJECT_INVALID", "Môn học thiếu subjectId"));
            return null;
        }
        if (subject.categoryId() == null || subject.categoryId().isBlank()) {
            unschedulable.add(entry(info, subject, "SUBJECT_CATEGORY_MISSING",
                "Môn " + subjectName(subject) + " chưa được gán danh mục môn học"));
            return null;
        }
        int planned = subject.plannedSessions() != null ? subject.plannedSessions() : 0;
        if (planned <= 0) {
            unschedulable.add(entry(info, subject, "MISSING_PLANNED_SESSIONS",
                "Môn " + subjectName(subject) + " chưa có số buổi kế hoạch"));
            return null;
        }
        int existing;
        try {
            existing = scheduleService.countScheduledSessions(orgId, info.id(),
                subject.subjectId(), subject.subjectName());
        } catch (RuntimeException ex) {
            unschedulable.add(entry(info, subject, "COUNT_FAILED",
                "Không đếm được số buổi đã xếp của môn " + subjectName(subject)));
            return null;
        }
        int needed = planned - existing;
        if (needed <= 0) return null;
        int perWeek = subject.sessionsPerWeek() != null && subject.sessionsPerWeek() > 0
            ? subject.sessionsPerWeek() : DEFAULT_SESSIONS_PER_WEEK;
        boolean assigned = subject.teacherId() != null && !subject.teacherId().isBlank();
        return new SubjectPlan(subject, needed, perWeek, assigned);
    }

    private SessionRequirement windowRequirement(ClassInfo info, Accepted accepted, int stage,
                                                 LocalDate stageStart, LocalDate stageEnd,
                                                 LocalDate dateFrom, LocalDate dateTo,
                                                 List<UnschedulableRequirement> unschedulable) {
        ClassSubjectInfo subject = accepted.plan().subject();
        LocalDate from = dateFrom != null && dateFrom.isAfter(stageStart) ? dateFrom : stageStart;
        LocalDate to = dateTo != null && dateTo.isBefore(stageEnd) ? dateTo : stageEnd;

        if (to.isBefore(from)) {
            unschedulable.add(entry(info, subject, "WINDOW_OUT_OF_RANGE",
                "Cửa sổ ngày của giai đoạn " + stage + " nằm ngoài khoảng đã chọn"));
            return null;
        }
        if (info.endDate() != null) {
            if (from.isAfter(info.endDate())) {
                unschedulable.add(entry(info, subject, "STAGE_AFTER_CLASS_END",
                    "Giai đoạn " + stage + " bắt đầu sau ngày kết thúc lớp"));
                return null;
            }
            if (to.isAfter(info.endDate())) {
                unschedulable.add(entry(info, subject, "STAGE_EXCEEDS_CLASS_END",
                    "Giai đoạn " + stage + " vượt ngày kết thúc lớp, cửa sổ đã cắt bớt"));
                to = info.endDate();
            }
        }
        int sessionMinutes = subject.sessionMinutes() != null && subject.sessionMinutes() > 0
            ? subject.sessionMinutes() : DEFAULT_SESSION_MINUTES;
        String roomRequirement = subject.roomRequirement() != null
            ? subject.roomRequirement() : "ANY";
        return new SessionRequirement(info.id(), info.name(), subject.subjectId(),
            subjectName(subject), accepted.teacherId(), accepted.candidates(),
            accepted.plan().needed(), accepted.plan().perWeek(), sessionMinutes,
            roomRequirement, info.studentCount(), from, to, stage);
    }

    private TeacherPool loadTeacherPool(String orgId, Set<String> subjectIds) {
        if (subjectIds.isEmpty()) return new TeacherPool(Map.of(), false);
        try {
            return new TeacherPool(people.eligibleTeachersBatch(orgId, subjectIds), false);
        } catch (RuntimeException ex) {
            return new TeacherPool(Map.of(), true);
        }
    }

    private String classBlockCode(ClassInfo info) {
        if ("DA_HUY".equals(info.status())) return "CLASS_CANCELLED";
        if ("DA_KET_THUC".equals(info.status())) return "CLASS_FINISHED";
        if (info.closeState() != null && !"NONE".equals(info.closeState())) return "CLASS_CLOSING";
        return null;
    }

    private String classBlockReason(String code) {
        return switch (code) {
            case "CLASS_CANCELLED" -> "Lớp đã hủy, không thể xếp lịch";
            case "CLASS_FINISHED" -> "Lớp đã kết thúc, không thể xếp lịch";
            default -> "Lớp đang chờ đóng/đã đóng, không thể xếp lịch";
        };
    }

    private int stageNo(ClassSubjectInfo subject) {
        return subject.stageNo() != null && subject.stageNo() > 0
            ? subject.stageNo() : DEFAULT_STAGE_NO;
    }

    private String subjectName(ClassSubjectInfo subject) {
        if (subject == null) return null;
        return subject.subjectName() != null ? subject.subjectName() : subject.subjectId();
    }

    private int ceilDiv(int value, int divisor) {
        return (value + divisor - 1) / divisor;
    }

    private UnschedulableRequirement entry(ClassInfo info, ClassSubjectInfo subject,
                                           String code, String reason) {
        return new UnschedulableRequirement(info.id(), info.name(),
            subject != null ? subject.subjectId() : null,
            subject != null ? subject.subjectName() : null, code, reason);
    }

    private record SubjectPlan(ClassSubjectInfo subject, int needed, int perWeek, boolean assigned) {}

    private record Accepted(SubjectPlan plan, String teacherId,
                            List<EligibleTeacherInfo> candidates) {}

    private record TeacherPool(Map<String, List<EligibleTeacherInfo>> bySubject, boolean failed) {}
}
