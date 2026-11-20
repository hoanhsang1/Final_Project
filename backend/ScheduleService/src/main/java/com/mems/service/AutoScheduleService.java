package com.mems.service;

import com.mems.client.ClassInfo;
import com.mems.client.EligibleTeacherInfo;
import com.mems.client.FacilityClient;
import com.mems.client.PeopleClient;
import com.mems.client.RoomInfo;
import com.mems.dto.AutoScheduleRequest;
import com.mems.dto.AutoScheduleResult;
import com.mems.dto.ScheduleRequest;
import com.mems.dto.ScheduleResponse;
import com.mems.exception.AppException;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Thuật toán xếp lịch tự động – Greedy + kiểm tra ràng buộc cứng.
 *
 * Ưu tiên xếp môn khó trước (ít giáo viên đủ điều kiện nhất).
 * Mỗi lần thử phân bổ đều gọi ScheduleService.create() — đảm bảo
 * kiểm tra conflict teacher / room / class ngay trên DB, không giả lập.
 *
 * Ràng buộc cứng:
 *  1. Không trùng lịch giáo viên.
 *  2. Không trùng lịch phòng.
 *  3. Không trùng lịch lớp.
 *  4. Giáo viên phải đủ điều kiện dạy môn (teacher_specialty → specialty.name_unaccented = subject.name_unaccented).
 *  5. Phòng phải active, không có thiết bị hỏng, đủ sức chứa.
 */
@Service
public class AutoScheduleService {

    private final ScheduleService scheduleService;
    private final PeopleClient people;
    private final FacilityClient facility;

    public AutoScheduleService(ScheduleService scheduleService, PeopleClient people, FacilityClient facility) {
        this.scheduleService = scheduleService;
        this.people = people;
        this.facility = facility;
    }

    /**
     * Chạy thuật toán xếp lịch tự động.
     *
     * @param orgId        ID tổ chức (từ JWT)
     * @param departmentId ID phòng ban (xác định phạm vi lịch)
     * @param request      Yêu cầu xếp lịch
     */
    public AutoScheduleResult generate(String orgId, String departmentId, AutoScheduleRequest request) {
        List<ScheduleResponse> scheduled = new ArrayList<>();
        List<AutoScheduleResult.UnscheduledItem> unscheduled = new ArrayList<>();

        // ---- 1. Thu thập thông tin lớp + giáo viên đủ điều kiện ----
        List<ClassCandidate> candidates = new ArrayList<>();
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

            // subjectId: lấy từ ClassInfo — field subjectName. Cần subjectId để tìm eligible teachers.
            // ClassInfo hiện có subjectName, không có subjectId.
            // Ta dùng teacherId đã được assign (nếu có) hoặc tìm eligible teachers qua subjectName.
            // Với MVP: nếu lớp có assigned teacher → dùng teacher đó.
            // Nếu không → tìm eligible teachers. Cần biết subjectId.
            // Ta gọi internal endpoint với subjectId = null sẽ lỗi.
            // Giải pháp: ClassInfo.teacherId() đã có. Nếu có assigned teacher → dùng.
            // Nếu không có → unscheduled với lý do rõ ràng (cần assign teacher trước).

            List<EligibleTeacherInfo> eligibleTeachers;
            if (info.teacherId() != null && !info.teacherId().isBlank()) {
                // Lớp đã có giáo viên được assign → chỉ dùng giáo viên đó
                eligibleTeachers = List.of(new EligibleTeacherInfo(info.teacherId(), info.teacherName(), departmentId));
            } else {
                // Chưa assign → không thể xếp lịch tự động (cần biết subjectId để tìm eligible)
                unscheduled.add(new AutoScheduleResult.UnscheduledItem(classId, info.name(),
                    info.subjectName(), "Lớp chưa có giáo viên được phân công. Hãy gán giáo viên trước khi xếp lịch tự động."));
                continue;
            }

            candidates.add(new ClassCandidate(info, eligibleTeachers));
        }

        // ---- 2. Ưu tiên lớp ít giáo viên đủ điều kiện nhất (khó xếp nhất trước) ----
        candidates.sort(Comparator.comparingInt(c -> c.eligibleTeachers().size()));

        // ---- 3. Lấy phòng khả dụng theo department ----
        List<RoomInfo> availableRooms = facility.rooms(orgId, departmentId).stream()
            .filter(r -> "active".equals(r.status()) && r.brokenEquipmentCount() == 0)
            .toList();

        if (availableRooms.isEmpty()) {
            // Không có phòng → toàn bộ unscheduled
            for (ClassCandidate c : candidates) {
                unscheduled.add(new AutoScheduleResult.UnscheduledItem(c.info().id(), c.info().name(),
                    c.info().subjectName(), "Không có phòng học khả dụng trong phòng ban"));
            }
            return buildResult(scheduled, unscheduled, request.classIds().size());
        }

        // ---- 4. Lọc ngày hợp lệ (theo sessionDays nếu có) ----
        Set<Integer> allowedDays = request.sessionDays() != null && !request.sessionDays().isEmpty()
            ? Set.copyOf(request.sessionDays()) : Set.of(1, 2, 3, 4, 5, 6, 7);

        List<LocalDate> candidateDates = buildDateList(request.dateFrom(), request.dateTo(), allowedDays);

        if (candidateDates.isEmpty()) {
            for (ClassCandidate c : candidates) {
                unscheduled.add(new AutoScheduleResult.UnscheduledItem(c.info().id(), c.info().name(),
                    c.info().subjectName(), "Không có ngày hợp lệ trong khoảng thời gian đã chọn"));
            }
            return buildResult(scheduled, unscheduled, request.classIds().size());
        }

        // ---- 5. Greedy: lần lượt xếp từng lớp ----
        for (ClassCandidate candidate : candidates) {
            ClassInfo info = candidate.info();
            boolean classScheduled = false;
            String lastFailReason = "Không tìm được slot phù hợp";

            outer:
            for (LocalDate date : candidateDates) {
                for (AutoScheduleRequest.TimeSlot slot : request.slots()) {
                    Instant start = toInstant(date, slot.startTime());
                    Instant end   = toInstant(date, slot.endTime());

                    for (EligibleTeacherInfo teacher : candidate.eligibleTeachers()) {
                        // Tìm phòng đủ sức chứa
                        RoomInfo room = findRoom(availableRooms, info.studentCount());
                        if (room == null) {
                            lastFailReason = "Không có phòng đủ sức chứa cho " + info.studentCount() + " học sinh";
                            continue;
                        }

                        ScheduleRequest req = new ScheduleRequest(
                            info.id(), teacher.userId(), room.id(), start, end);
                        try {
                            ScheduleResponse session = scheduleService.create(orgId, departmentId, req);
                            scheduled.add(session);
                            classScheduled = true;
                            break outer;
                        } catch (AppException ex) {
                            // Conflict → thử slot khác/giáo viên khác/phòng khác
                            lastFailReason = mapConflictReason(ex);
                        }
                    }
                }
            }

            if (!classScheduled) {
                unscheduled.add(new AutoScheduleResult.UnscheduledItem(
                    info.id(), info.name(), info.subjectName(), lastFailReason));
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

    private Instant toInstant(LocalDate date, LocalTime time) {
        return date.atTime(time).toInstant(ZoneOffset.UTC);
    }

    private RoomInfo findRoom(List<RoomInfo> rooms, int requiredCapacity) {
        return rooms.stream()
            .filter(r -> r.capacity() >= requiredCapacity)
            .min(Comparator.comparingInt(RoomInfo::capacity)) // phòng vừa đủ → ít lãng phí nhất
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

    private record ClassCandidate(ClassInfo info, List<EligibleTeacherInfo> eligibleTeachers) {}
}
