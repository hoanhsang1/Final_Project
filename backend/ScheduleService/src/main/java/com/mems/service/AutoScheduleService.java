package com.mems.service;

import com.mems.client.ClassInfo;
import com.mems.client.ClassSubjectInfo;
import com.mems.client.EligibleTeacherInfo;
import com.mems.client.FacilityClient;
import com.mems.client.PeopleClient;
import com.mems.client.RoomInfo;
import com.mems.dto.AutoScheduleRequest;
import com.mems.dto.AutoScheduleResult;
import com.mems.dto.ScheduleRequest;
import com.mems.dto.ScheduleResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.time.SchoolClock;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

/**
 * Thuật toán xếp lịch tự động – Greedy + kiểm tra ràng buộc cứng.
 *
 * Hỗ trợ quét toàn bộ môn học của lớp (cả môn chính và môn thêm thủ công / CTĐT).
 * Ưu tiên xếp môn khó trước (ít giáo viên đủ điều kiện nhất).
 * Mỗi lần phân bổ đều gọi ScheduleService.create() — kiểm tra conflict giáo viên / phòng / lớp trên DB.
 */
@Service
public class AutoScheduleService {

    private final ScheduleService scheduleService;
    private final PeopleClient people;
    private final FacilityClient facility;
    private final SchoolClock clock;

    public AutoScheduleService(ScheduleService scheduleService, PeopleClient people,
                               FacilityClient facility, SchoolClock clock) {
        this.scheduleService = scheduleService;
        this.people = people;
        this.facility = facility;
        this.clock = clock;
    }

    /**
     * Chạy thuật toán xếp lịch tự động cho các môn của từng lớp.
     */
    public AutoScheduleResult generate(String orgId, String departmentId, AutoScheduleRequest request) {
        List<ScheduleResponse> scheduled = new ArrayList<>();
        List<AutoScheduleResult.UnscheduledItem> unscheduled = new ArrayList<>();

        // ---- 1. Thu thập thông tin các môn học cần xếp của từng lớp ----
        List<ClassSubjectCandidate> candidates = new ArrayList<>();

        for (String classId : request.classIds()) {
            ClassInfo info = people.classInfo(orgId, classId);
            if (info == null) {
                unscheduled.add(new AutoScheduleResult.UnscheduledItem(classId, null, null,
                    "Lớp không tồn tại trong tổ chức"));
                continue;
            }
            if ("DA_HUY".equals(info.status()) || "DA_KET_THUC".equals(info.status())) {
                unscheduled.add(new AutoScheduleResult.UnscheduledItem(classId, info.name(),
                    info.subjectName(), "Lớp đã hủy hoặc đã kết thúc, không thể xếp lịch"));
                continue;
            }

            // Lấy danh sách tất cả môn học của lớp (từ bảng class_subject)
            List<ClassSubjectInfo> subjects = people.classSubjects(orgId, classId);

            // Fallback nếu lớp chưa dùng bảng class_subject: lấy môn chính từ school_class
            if ((subjects == null || subjects.isEmpty()) && (info.subjectId() != null || info.subjectName() != null)) {
                subjects = List.of(new ClassSubjectInfo(
                    info.id(), info.subjectId(), null, info.subjectName(),
                    "LEGACY", null, null, 1, 90, info.teacherId(), info.teacherName(), true, "PLANNED"
                ));
            }

            if (subjects == null || subjects.isEmpty()) {
                unscheduled.add(new AutoScheduleResult.UnscheduledItem(classId, info.name(),
                    null, "Lớp chưa có giáo viên được phân công và chưa có môn học. "
                        + "Hãy gán giáo viên hoặc môn học trước khi xếp lịch tự động."));
                continue;
            }

            for (ClassSubjectInfo subj : subjects) {
                String subjectId = subj.subjectId();
                String subjectName = subj.subjectName();

                List<EligibleTeacherInfo> eligibleTeachers;

                if (subj.teacherId() != null && !subj.teacherId().isBlank()) {
                    eligibleTeachers = List.of(new EligibleTeacherInfo(subj.teacherId(), subj.teacherName(), departmentId));
                } else if (subjectId != null && !subjectId.isBlank()) {
                    eligibleTeachers = people.eligibleTeachers(orgId, subjectId);
                    if (eligibleTeachers.isEmpty()) {
                        // Fallback kiểm tra giáo viên chủ nhiệm / lớp
                        if (info.teacherId() != null && !info.teacherId().isBlank()) {
                            eligibleTeachers = List.of(new EligibleTeacherInfo(info.teacherId(), info.teacherName(), departmentId));
                        } else {
                            unscheduled.add(new AutoScheduleResult.UnscheduledItem(classId, info.name(),
                                subjectName, "Không có giáo viên đủ điều kiện dạy môn " + subjectName
                                    + ". Hãy phân công giáo viên cho môn học này."));
                            continue;
                        }
                    }
                } else if (info.teacherId() != null && !info.teacherId().isBlank()) {
                    eligibleTeachers = List.of(new EligibleTeacherInfo(info.teacherId(), info.teacherName(), departmentId));
                } else {
                    unscheduled.add(new AutoScheduleResult.UnscheduledItem(classId, info.name(),
                        subjectName, "Lớp chưa có giáo viên được phân công và chưa có môn học. "
                            + "Hãy gán giáo viên hoặc môn học trước khi xếp lịch tự động."));
                    continue;
                }

                int planned = subj.plannedSessions() != null ? subj.plannedSessions() : 1;
                int existing = scheduleService.countScheduledSessions(orgId, classId, subjectName);
                int needed = Math.max(0, planned - existing);

                if (needed == 0) {
                    // Môn này đã đủ số buổi theo kế hoạch
                    continue;
                }

                candidates.add(new ClassSubjectCandidate(info, subj, eligibleTeachers, needed));
            }
        }

        // ---- 2. Ưu tiên môn ít giáo viên đủ điều kiện nhất (khó xếp nhất trước) ----
        candidates.sort(Comparator.comparingInt(c -> c.eligibleTeachers().size()));

        // ---- 3. Lấy phòng khả dụng theo department ----
        List<RoomInfo> availableRooms;
        try {
            availableRooms = facility.rooms(orgId, departmentId).stream()
                .filter(r -> "active".equals(r.status()) && r.brokenEquipmentCount() == 0)
                .toList();
        } catch (AppException ex) {
            // Facility chưa sẵn sàng: coi như chưa có phòng để báo lý do thay vì lỗi 500.
            if (ex.getErrorCode() != ErrorCode.FACILITY_UNAVAILABLE) throw ex;
            availableRooms = List.of();
        }

        if (availableRooms.isEmpty()) {
            for (ClassSubjectCandidate c : candidates) {
                unscheduled.add(new AutoScheduleResult.UnscheduledItem(c.classInfo().id(), c.classInfo().name(),
                    c.subjectInfo().subjectName(), "Không có phòng học khả dụng trong phòng ban"));
            }
            return buildResult(scheduled, unscheduled, request.classIds().size());
        }

        // ---- 4. Lọc ngày hợp lệ (theo sessionDays nếu có) ----
        Set<Integer> allowedDays = request.sessionDays() != null && !request.sessionDays().isEmpty()
            ? Set.copyOf(request.sessionDays()) : Set.of(1, 2, 3, 4, 5, 6, 7);

        List<LocalDate> candidateDates = buildDateList(request.dateFrom(), request.dateTo(), allowedDays);

        if (candidateDates.isEmpty()) {
            for (ClassSubjectCandidate c : candidates) {
                unscheduled.add(new AutoScheduleResult.UnscheduledItem(c.classInfo().id(), c.classInfo().name(),
                    c.subjectInfo().subjectName(), "Không có ngày hợp lệ trong khoảng thời gian đã chọn"));
            }
            return buildResult(scheduled, unscheduled, request.classIds().size());
        }

        // ---- 5. Greedy: lần lượt xếp từng môn của từng lớp ----
        for (ClassSubjectCandidate candidate : candidates) {
            ClassInfo info = candidate.classInfo();
            ClassSubjectInfo subj = candidate.subjectInfo();
            int sessionsToSchedule = candidate.sessionsNeeded();
            int sessionsScheduled = 0;
            String lastFailReason = "Không tìm được slot phù hợp";

            outerSlot:
            for (LocalDate date : candidateDates) {
                for (AutoScheduleRequest.TimeSlot slot : request.slots()) {
                    Instant start = clock.toInstant(date, slot.startTime());
                    Instant end   = clock.toInstant(date, slot.endTime());

                    List<RoomInfo> suitableRooms = availableRooms.stream()
                        .filter(r -> r.capacity() >= info.studentCount())
                        .sorted(Comparator.comparingInt(RoomInfo::capacity))
                        .toList();

                    if (suitableRooms.isEmpty()) {
                        lastFailReason = "Không có phòng đủ sức chứa cho " + info.studentCount() + " học sinh";
                        continue;
                    }

                    boolean sessionScheduledInThisSlot = false;
                    for (EligibleTeacherInfo teacher : candidate.eligibleTeachers()) {
                        for (RoomInfo room : suitableRooms) {
                            ScheduleRequest req = new ScheduleRequest(
                                info.id(), teacher.userId(), teacher.fullName(), subj.subjectName(), room.id(), start, end);
                            try {
                                ScheduleResponse session = scheduleService.create(orgId, departmentId, req);
                                scheduled.add(session);
                                sessionsScheduled++;
                                sessionScheduledInThisSlot = true;
                                if (sessionsScheduled >= sessionsToSchedule) {
                                    break outerSlot;
                                }
                                break; // Buổi này đã xếp thành công vào phòng, chuyển sang slot tiếp theo
                            } catch (AppException ex) {
                                lastFailReason = mapConflictReason(ex);
                                if (!"ROOM_SCHEDULE_CONFLICT".equals(ex.getErrorCode().name())) {
                                    // Nếu xung đột do giáo viên hoặc lớp, thử phòng khác không có tác dụng với giáo viên này
                                    break;
                                }
                                // Nếu là ROOM_SCHEDULE_CONFLICT, tiếp tục vòng lặp thử phòng tiếp theo!
                            }
                        }
                        if (sessionScheduledInThisSlot) {
                            break; // Xong slot này, chuyển sang slot tiếp theo
                        }
                    }
                }
            }

            if (sessionsScheduled == 0) {
                unscheduled.add(new AutoScheduleResult.UnscheduledItem(
                    info.id(), info.name(), subj.subjectName(), lastFailReason));
            }
        }

        return buildResult(scheduled, unscheduled, request.classIds().size());
    }

    // ---- helpers ----

    private List<LocalDate> buildDateList(LocalDate from, LocalDate to, Set<Integer> allowedDays) {
        List<LocalDate> dates = new ArrayList<>();
        LocalDate d = from;
        while (!d.isAfter(to)) {
            int dow = d.getDayOfWeek().getValue(); // 1=Monday … 7=Sunday
            if (allowedDays.contains(dow)) dates.add(d);
            d = d.plusDays(1);
        }
        return dates;
    }

    private RoomInfo findRoom(List<RoomInfo> rooms, int requiredCapacity) {
        return rooms.stream()
            .filter(r -> r.capacity() >= requiredCapacity)
            .min(Comparator.comparingInt(RoomInfo::capacity))
            .orElse(null);
    }

    private String mapConflictReason(AppException ex) {
        return switch (ex.getErrorCode().name()) {
            case "TEACHER_SCHEDULE_CONFLICT" -> "Giáo viên đã có lịch trong khung giờ này";
            case "ROOM_SCHEDULE_CONFLICT"    -> "Phòng đã được đặt trong khung giờ này";
            case "CLASS_SCHEDULE_CONFLICT"   -> "Lớp đã có buổi học trong khung giờ này";
            case "ROOM_NOT_AVAILABLE"        -> "Phòng không khả dụng (đang bảo trì hoặc thiết bị hỏng)";
            default                          -> ex.getErrorCode().getMessage();
        };
    }

    private AutoScheduleResult buildResult(List<ScheduleResponse> scheduled,
                                           List<AutoScheduleResult.UnscheduledItem> unscheduled,
                                           int total) {
        return new AutoScheduleResult(scheduled, unscheduled,
            new AutoScheduleResult.Summary(total, scheduled.size(), unscheduled.size()));
    }

    private record ClassSubjectCandidate(
        ClassInfo classInfo,
        ClassSubjectInfo subjectInfo,
        List<EligibleTeacherInfo> eligibleTeachers,
        int sessionsNeeded
    ) {}
}
