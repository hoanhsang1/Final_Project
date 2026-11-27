package com.mems.service;

import com.mems.client.ClassInfo;
import com.mems.client.ClassSubjectInfo;
import com.mems.client.EligibleTeacherInfo;
import com.mems.client.FacilityClient;
import com.mems.client.PeopleClient;
import com.mems.client.RoomInfo;
import com.mems.dto.AutoScheduleRequest;
import com.mems.dto.AutoScheduleRequest.TimeSlot;
import com.mems.dto.AutoScheduleResult;
import com.mems.dto.ScheduleResponse;
import com.mems.exception.ApiException;
import com.mems.time.SchoolClock;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.BadSqlGrammarException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;

/** Thuật toán greedy xếp lịch: ưu tiên môn theo giai đoạn/độ khó, chặn trùng cứng. */
@Service
public class AutoScheduleService {
    private static final int SLOT_MINUTES = 45;
    private static final Set<String> CLOSED_CLASS = Set.of("DA_HUY", "DA_KET_THUC");

    private final JdbcTemplate jdbc;
    private final PeopleClient people;
    private final FacilityClient facility;
    private final SchoolClock clock;

    public AutoScheduleService(JdbcTemplate jdbc, PeopleClient people, FacilityClient facility, SchoolClock clock) {
        this.jdbc = jdbc;
        this.people = people;
        this.facility = facility;
        this.clock = clock;
    }

    /**
     * dryRun=true chỉ tính nháp (không INSERT); dryRun=false chạy lại thuật toán,
     * kiểm tra xung đột lần cuối rồi mới ghi session.
     */
    @Transactional
    public AutoScheduleResult generate(String orgId, String departmentId,
                                       AutoScheduleRequest request, boolean dryRun) {
        if (request.dateFrom() == null || request.dateTo() == null
            || request.dateFrom().isAfter(request.dateTo())) throw invalid("Khoảng ngày không hợp lệ");
        if (request.sessionsPerWeek() != null && request.sessionsPerWeek() < 1)
            throw invalid("Số buổi/tuần phải lớn hơn 0");
        if (request.sessionMinutes() != null && request.sessionMinutes() < 1)
            throw invalid("Số phút/buổi phải lớn hơn 0");
        List<TimeSlot> slots = validSlots(request.slots());
        Set<Integer> days = allowedDays(request.sessionDays());
        List<RoomInfo> rooms = usableRooms(facility.roomsOfOrg(orgId));
        Plan plan = new Plan();

        for (String classId : request.classIds()) {
            if (classId == null || classId.isBlank()) continue;
            ClassInfo info = people.classInfo(orgId, classId);
            if (info == null) {
                plan.unscheduled.add(new AutoScheduleResult.UnscheduledItem(
                    classId, null, null, "Lớp không tồn tại trong tổ chức"));
                continue;
            }
            if (CLOSED_CLASS.contains(info.status())) {
                plan.unscheduled.add(new AutoScheduleResult.UnscheduledItem(
                    classId, info.name(), info.subjectName(), "Lớp đã hủy hoặc đã kết thúc, không thể xếp lịch"));
                continue;
            }
            // S2: cắt giao khoảng yêu cầu với vòng đời của lớp.
            LocalDate from = info.startDate() == null ? request.dateFrom() : max(request.dateFrom(), info.startDate());
            LocalDate to = info.endDate() == null ? request.dateTo() : min(request.dateTo(), info.endDate());
            List<LocalDate> dates = days.stream().sorted()
                .flatMap(day -> clock.datesOfWeekday(from, to, day).stream()).sorted().toList();
            if (from.isAfter(to) || dates.isEmpty()) {
                plan.unscheduled.add(new AutoScheduleResult.UnscheduledItem(
                    classId, info.name(), info.subjectName(),
                    "Không có ngày hợp lệ trong thời gian hoạt động của lớp"));
                continue;
            }
            if (rooms.isEmpty()) {
                plan.unscheduled.add(new AutoScheduleResult.UnscheduledItem(
                    classId, info.name(), info.subjectName(), "Không có phòng học khả dụng trong tổ chức"));
                continue;
            }
            int capacity = requiredCapacity(orgId, classId, info.studentCount());

            List<ClassSubjectInfo> subjects = people.classSubjects(orgId, classId);
            if (subjects.isEmpty() && (info.subjectId() != null || info.subjectName() != null)) {
                // S1: fallback môn chính trên school_class khi lớp chưa có class_subject.
                subjects = List.of(new ClassSubjectInfo(info.id(), info.subjectId(), info.subjectName(),
                    SLOT_MINUTES, info.teacherId(), info.teacherName(), 1, 2));
            }
            if (subjects.isEmpty()) {
                plan.unscheduled.add(new AutoScheduleResult.UnscheduledItem(
                    classId, info.name(), null,
                    "Lớp chưa có môn học. Hãy thiết lập chương trình hoặc thêm môn trước khi xếp lịch"));
                continue;
            }

            List<Candidate> candidates = new ArrayList<>();
            for (ClassSubjectInfo subject : subjects) {
                if ("CANCELLED".equalsIgnoreCase(subject.status())) continue;
                String subjectName = firstNonBlank(subject.subjectName(), info.subjectName());
                if (subject.subjectId() == null || subject.subjectId().isBlank()) {
                    plan.unscheduled.add(new AutoScheduleResult.UnscheduledItem(
                        classId, info.name(), subjectName, "Môn học chưa có mã, không xác định được giáo viên"));
                    continue;
                }
                // D1: chỉ dùng danh sách giáo viên đủ điều kiện từ PeopleService.
                List<EligibleTeacherInfo> eligible = people.eligibleTeachers(orgId, subject.subjectId());
                if (eligible.isEmpty()) {
                    plan.unscheduled.add(new AutoScheduleResult.UnscheduledItem(classId, info.name(), subjectName,
                        "Không có giáo viên đủ điều kiện dạy môn " + subjectName));
                    continue;
                }
                String preferred = firstNonBlank(subject.teacherId(), info.teacherId());
                List<EligibleTeacherInfo> teachers;
                if (preferred != null) {
                    EligibleTeacherInfo assigned = eligible.stream()
                        .filter(t -> preferred.equals(t.userId())).findFirst().orElse(null);
                    if (assigned == null) {
                        plan.unscheduled.add(new AutoScheduleResult.UnscheduledItem(classId, info.name(), subjectName,
                            "Giáo viên được phân công không đủ điều kiện dạy môn " + subjectName));
                        continue;
                    }
                    teachers = Stream.concat(Stream.of(assigned),
                        eligible.stream().filter(t -> !preferred.equals(t.userId()))).toList();
                } else {
                    teachers = eligible;
                }
                candidates.add(new Candidate(info, subject, teachers));
            }
            // D9: môn sớm hơn trước; cùng giai đoạn thì môn ít giáo viên hơn trước.
            candidates.sort(Comparator.comparingInt((Candidate c) -> c.subject().stageNo())
                .thenComparingInt(c -> c.teachers().size()));
            for (Candidate candidate : candidates) {
                scheduleSubject(orgId, departmentId, candidate, dates, slots, rooms, capacity, dryRun, plan,
                    request.sessionsPerWeek(), request.sessionMinutes());
            }
        }
        return new AutoScheduleResult(plan.scheduled, plan.unscheduled,
            new AutoScheduleResult.Summary(request.classIds().size(), plan.scheduled.size(), plan.unscheduled.size()));
    }

    private void scheduleSubject(String orgId, String departmentId, Candidate candidate,
                                 List<LocalDate> dates, List<TimeSlot> slots, List<RoomInfo> rooms,
                                 int capacity, boolean dryRun, Plan plan,
                                 Integer sessionsOverride, Integer minutesOverride) {
        ClassInfo info = candidate.info();
        ClassSubjectInfo subject = candidate.subject();
        String subjectName = firstNonBlank(subject.subjectName(), info.subjectName());
        // Nguồn "Nhập tay" cho phép override; nguồn chương trình vẫn dùng giá trị class_subject (D8).
        int sessionMinutes = minutesOverride != null ? minutesOverride
            : (subject.sessionMinutes() != null && subject.sessionMinutes() > 0
                ? subject.sessionMinutes() : SLOT_MINUTES);
        int perWeek = sessionsOverride != null ? sessionsOverride : subject.sessionsPerWeek();
        List<RoomInfo> suitable = rooms.stream().filter(r -> r.capacity() >= capacity).toList();
        if (suitable.isEmpty()) {
            plan.unscheduled.add(new AutoScheduleResult.UnscheduledItem(info.id(), info.name(), subjectName,
                "Không có phòng đủ sức chứa cho " + capacity + " học sinh"));
            return;
        }
        seedWeekCounts(orgId, info.id(), subjectName, plan);
        String reason = "Không tìm được khung giờ phù hợp";
        String conflictCode = null;
        int placed = 0;

        for (LocalDate date : dates) {
            String weekKey = weekCountKey(info.id(), subjectName, date);
            // D8: giới hạn số buổi mỗi tuần ISO theo sessionsPerWeek của môn.
            if (plan.weekCounts.getOrDefault(weekKey, 0) >= perWeek) continue;
            for (Block block : contiguousBlocks(date, slots, sessionMinutes)) {
                Attempt attempt = place(orgId, departmentId, candidate, subjectName, suitable,
                    block, weekKey, dryRun, plan);
                if (attempt.placed()) {
                    placed++;
                    break; // Đã xếp buổi cho ngày này → chuyển sang ngày tiếp theo.
                }
                reason = attempt.reason();
                conflictCode = attempt.code();
            }
        }
        if (placed == 0) {
            // S5: khi xác nhận mà lý do duy nhất là trùng lịch thì trả mã lỗi cụ thể, không ghi DB.
            if (!dryRun && conflictCode != null) throw conflict(conflictCode, reason);
            plan.unscheduled.add(new AutoScheduleResult.UnscheduledItem(info.id(), info.name(), subjectName, reason));
        }
    }

    private Attempt place(String orgId, String departmentId, Candidate candidate, String subjectName,
                          List<RoomInfo> rooms, Block block, String weekKey,
                          boolean dryRun, Plan plan) {
        ClassInfo info = candidate.info();
        Instant start = clock.toInstant(block.date(), block.start());
        Instant end = clock.toInstant(block.date(), block.end());
        Attempt last = null;

        for (EligibleTeacherInfo teacher : candidate.teachers()) {
            if (teacher == null || teacher.userId() == null || teacher.userId().isBlank()) continue;
            if (busy("teacher_id", teacher.userId(), start, end, orgId, plan)) {
                last = Attempt.fail("Giáo viên đã có lịch trong khung giờ này", "TEACHER_SCHEDULE_CONFLICT");
                continue;
            }
            for (RoomInfo room : rooms) {
                if (busy("room_id", room.id(), start, end, orgId, plan)) {
                    last = Attempt.fail("Phòng đã được đặt trong khung giờ này", "ROOM_SCHEDULE_CONFLICT");
                    continue;
                }
                if (busy("class_id", info.id(), start, end, orgId, plan)) {
                    last = Attempt.fail("Lớp đã có buổi học trong khung giờ này", "CLASS_SCHEDULE_CONFLICT");
                    continue;
                }
                String teacherName = firstNonBlank(teacher.fullName(), candidate.subject().teacherName(), info.teacherName());
                String roomCode = firstNonBlank(room.code(), room.name());
                String id;
                if (dryRun) {
                    id = "PREVIEW-" + plan.previewNo.getAndIncrement();
                } else {
                    try {
                        // Kiểm tra lại ngay trước ghi; nếu có người khác vừa đặt chỗ thì thử phương án khác.
                        assertNoConflict(orgId, info.id(), teacher.userId(), room.id(), start, end);
                        id = insertSession(orgId, departmentId, info.id(), teacher.userId(), room.id(),
                            teacherName, roomCode, subjectName, start, end);
                    } catch (ApiException ex) {
                        if (ex.getCode() == null || !ex.getCode().endsWith("SCHEDULE_CONFLICT")) throw ex;
                        last = Attempt.fail(ex.getMessage(), ex.getCode());
                        continue;
                    }
                }
                plan.scheduled.add(new ScheduleResponse(id, info.id(), firstNonBlank(info.classCode(), info.name()),
                    teacher.userId(), teacherName, room.id(), roomCode, subjectName, start, end, "scheduled"));
                plan.allocated.add(new Allocated(info.id(), teacher.userId(), room.id(), start, end));
                plan.weekCounts.merge(weekKey, 1, Integer::sum);
                return Attempt.ok();
            }
        }
        return last == null
            ? Attempt.fail("Không tìm được giáo viên và phòng trống trong khung giờ này", null) : last;
    }

    /** D10/D11: chỉ ghép các slot liền nhau (end == start), không ghép qua giờ nghỉ. */
    private List<Block> contiguousBlocks(LocalDate date, List<TimeSlot> slots, int sessionMinutes) {
        List<Block> blocks = new ArrayList<>();
        LocalTime runStart = null;
        LocalTime runEnd = null;
        int total = 0;
        for (TimeSlot slot : slots.stream().sorted(Comparator.comparing(TimeSlot::startTime)).toList()) {
            int minutes = (int) Duration.between(slot.startTime(), slot.endTime()).toMinutes();
            if (minutes <= 0 || minutes % SLOT_MINUTES != 0)
                throw invalid("Mỗi khung giờ phải có thời lượng là bội của 45 phút");
            if (runEnd != null && !runEnd.equals(slot.startTime())) {
                if (total >= sessionMinutes) blocks.add(new Block(date, runStart, runEnd));
                runStart = null;
                total = 0;
            }
            if (runStart == null) runStart = slot.startTime();
            runEnd = slot.endTime();
            total += minutes;
            if (total >= sessionMinutes) {
                blocks.add(new Block(date, runStart, runEnd));
                runStart = null;
                total = 0;
            }
        }
        if (runStart != null && total >= sessionMinutes) blocks.add(new Block(date, runStart, runEnd));
        return blocks;
    }

    private boolean busy(String column, String value, Instant start, Instant end, String orgId, Plan plan) {
        if (dbConflict(column, value, start, end, orgId)) return true;
        return plan.allocated.stream().anyMatch(a -> a.overlaps(start, end)
            && switch (column) {
                case "teacher_id" -> Objects.equals(value, a.teacherId());
                case "room_id" -> Objects.equals(value, a.roomId());
                default -> Objects.equals(value, a.classId());
            });
    }

    private boolean dbConflict(String column, String value, Instant start, Instant end, String orgId) {
        // column chỉ truyền từ code (teacher_id/room_id/class_id); khoảng [start,end) nửa mở.
        Integer count = jdbc.queryForObject("""
            SELECT COUNT(*) FROM session s JOIN `class` c ON c.id=s.class_id
            WHERE s.%s=? AND s.start_time < ? AND s.end_time > ?
              AND s.status='scheduled' AND s.deleted_at IS NULL AND c.org_id=?
            """.formatted(column), Integer.class,
            value, Timestamp.from(start), Timestamp.from(end), orgId);
        return count != null && count > 0;
    }

    /** Kiểm tra lại ngay trước INSERT để xử lý trường hợp người khác đặt phòng sau lúc tính nháp. */
    private void assertNoConflict(String orgId, String classId, String teacherId,
                                  String roomId, Instant start, Instant end) {
        if (dbConflict("teacher_id", teacherId, start, end, orgId))
            throw conflict("TEACHER_SCHEDULE_CONFLICT", "Giáo viên đã có lịch trong khung giờ này");
        if (dbConflict("room_id", roomId, start, end, orgId))
            throw conflict("ROOM_SCHEDULE_CONFLICT", "Phòng đã được đặt trong khung giờ này");
        if (dbConflict("class_id", classId, start, end, orgId))
            throw conflict("CLASS_SCHEDULE_CONFLICT", "Lớp đã có buổi học trong khung giờ này");
    }

    private String insertSession(String orgId, String departmentId, String classId, String teacherId,
                                 String roomId, String teacherName, String roomCode, String subjectName,
                                 Instant start, Instant end) {
        String id = UUID.randomUUID().toString();
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("""
            INSERT INTO session(id,class_id,department_id,teacher_id,room_id,start_time,end_time,
                                status,teacher_name,room_code,subject_name,created_at,updated_at)
            VALUES (?,?,?,?,?,?,?,'scheduled',?,?,?,?,?)
            """, id, classId, departmentId, teacherId, roomId,
            Timestamp.from(start), Timestamp.from(end), teacherName, roomCode, subjectName, now, now);
        return id;
    }

    /** S3: max_size có thể chưa có trong schema → fallback theo sĩ số thực tế. */
    private int requiredCapacity(String orgId, String classId, int studentCount) {
        try {
            Integer required = jdbc.queryForObject("""
                SELECT MAX(COALESCE(max_size,0), ?) FROM `class`
                WHERE id=? AND org_id=? AND deleted_at IS NULL
                """, Integer.class, studentCount, classId, orgId);
            if (required != null) return Math.max(required, studentCount);
        } catch (BadSqlGrammarException ignored) {
            // Schema hiện tại chưa có cột max_size.
        }
        return studentCount;
    }

    private void seedWeekCounts(String orgId, String classId, String subjectName, Plan plan) {
        jdbc.query("""
            SELECT s.subject_name, s.start_time FROM session s JOIN `class` c ON c.id=s.class_id
            WHERE s.class_id=? AND s.status='scheduled' AND s.deleted_at IS NULL AND c.org_id=?
            """, rs -> {
                if (!Objects.equals(rs.getString("subject_name"), subjectName)) return;
                Timestamp start = rs.getTimestamp("start_time");
                if (start != null) {
                    String key = weekCountKey(classId, subjectName, clock.toLocalDate(start.toInstant()));
                    plan.weekCounts.merge(key, 1, Integer::sum);
                }
            }, classId, orgId);
    }

    private String weekCountKey(String classId, String subjectName, LocalDate date) {
        WeekFields iso = WeekFields.ISO;
        return classId + '|' + Objects.toString(subjectName, "") + '|'
            + date.get(iso.weekBasedYear()) + "-W" + date.get(iso.weekOfWeekBasedYear());
    }

    private List<TimeSlot> validSlots(List<TimeSlot> slots) {
        if (slots == null || slots.isEmpty()) throw invalid("Cần chọn ít nhất một khung giờ");
        for (TimeSlot slot : slots) {
            if (slot == null || slot.startTime() == null || slot.endTime() == null
                || !slot.endTime().isAfter(slot.startTime())
                || Duration.between(slot.startTime(), slot.endTime()).toMinutes() % SLOT_MINUTES != 0)
                throw invalid("Mỗi khung giờ phải có thời lượng là bội của 45 phút");
        }
        List<TimeSlot> ordered = slots.stream().sorted(Comparator.comparing(TimeSlot::startTime)).toList();
        for (int i = 1; i < ordered.size(); i++) {
            if (ordered.get(i - 1).endTime().isAfter(ordered.get(i).startTime()))
                throw invalid("Các khung giờ không được chồng chéo");
        }
        return ordered;
    }

    private Set<Integer> allowedDays(List<Integer> sessionDays) {
        if (sessionDays == null || sessionDays.isEmpty()) return Set.of(1, 2, 3, 4, 5, 6, 7);
        return sessionDays.stream().filter(d -> d != null && d >= 1 && d <= 7)
            .collect(java.util.stream.Collectors.toSet());
    }

    private List<RoomInfo> usableRooms(List<RoomInfo> rooms) {
        return rooms.stream()
            .filter(r -> r != null && r.id() != null && !r.id().isBlank())
            .filter(r -> "active".equalsIgnoreCase(r.status()))
            .filter(r -> r.brokenEquipmentCount() == 0)
            // S7: phòng thường trước phòng máy, sau đó chọn phòng vừa đủ sức chứa.
            .sorted(Comparator.comparing((RoomInfo r) -> r.isComputerRoom()).thenComparingInt(RoomInfo::capacity))
            .toList();
    }

    private static LocalDate max(LocalDate a, LocalDate b) { return a.isAfter(b) ? a : b; }
    private static LocalDate min(LocalDate a, LocalDate b) { return a.isBefore(b) ? a : b; }

    private static String firstNonBlank(String... values) {
        for (String value : values) if (value != null && !value.isBlank()) return value;
        return null;
    }

    private static ApiException invalid(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message);
    }

    private static ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, code, message);
    }

    private record Candidate(ClassInfo info, ClassSubjectInfo subject, List<EligibleTeacherInfo> teachers) {}
    private record Block(LocalDate date, LocalTime start, LocalTime end) {}
    private record Allocated(String classId, String teacherId, String roomId, Instant start, Instant end) {
        boolean overlaps(Instant s, Instant e) { return start.isBefore(e) && end.isAfter(s); }
    }
    private record Attempt(boolean placed, String reason, String code) {
        static Attempt ok() { return new Attempt(true, null, null); }
        static Attempt fail(String reason, String code) { return new Attempt(false, reason, code); }
    }
    private static final class Plan {
        final List<ScheduleResponse> scheduled = new ArrayList<>();
        final List<AutoScheduleResult.UnscheduledItem> unscheduled = new ArrayList<>();
        final List<Allocated> allocated = new ArrayList<>();
        final Map<String, Integer> weekCounts = new HashMap<>();
        final AtomicInteger previewNo = new AtomicInteger(1);
    }
}
