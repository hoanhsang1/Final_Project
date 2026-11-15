package com.mems.service;

import com.mems.client.ClassInfo;
import com.mems.client.FacilityClient;
import com.mems.client.PeopleClient;
import com.mems.client.RoomInfo;
import com.mems.client.StudentClass;
import com.mems.dto.RoomSuggestionResponse;
import com.mems.dto.ScheduleRequest;
import com.mems.dto.ScheduleResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Buổi học theo phòng ban. Kiểm tra trùng giáo viên/phòng/lớp trong cùng khung giờ,
 * chặn lớp đã đóng/hủy và phòng đang bảo trì hoặc có thiết bị hỏng.
 */
@Service
public class ScheduleService {
    private static final String CLASS_CANCELLED = "DA_HUY";
    private static final String CLASS_FINISHED = "DA_KET_THUC";

    private final JdbcTemplate jdbc;
    private final PeopleClient people;
    private final FacilityClient facility;

    public ScheduleService(JdbcTemplate jdbc, PeopleClient people, FacilityClient facility) {
        this.jdbc = jdbc;
        this.people = people;
        this.facility = facility;
    }

    // --------------------------------------------------------------- queries

    @Transactional(readOnly = true)
    public List<ScheduleResponse> list(String orgId, String departmentId, Instant from, Instant to,
                                       String classId) {
        StringBuilder sql = new StringBuilder("""
            SELECT s.id, s.class_id, c.name AS class_name, s.teacher_id, s.room_id,
                   s.start_time, s.end_time, s.status, s.department_id
            FROM session s JOIN `class` c ON c.id=s.class_id
            WHERE c.org_id=? AND s.department_id=? AND s.deleted_at IS NULL AND c.deleted_at IS NULL
            """);
        List<Object> args = new ArrayList<>(List.of(orgId, departmentId));
        if (classId != null && !classId.isBlank()) {
            sql.append(" AND s.class_id=?");
            args.add(classId);
        }
        if (from != null) {
            sql.append(" AND s.end_time>=?");
            args.add(Timestamp.from(from));
        }
        if (to != null) {
            sql.append(" AND s.start_time<=?");
            args.add(Timestamp.from(to));
        }
        sql.append(" ORDER BY s.start_time");
        return jdbc.query(sql.toString(), this::map, args.toArray());
    }

    @Transactional
    public ScheduleResponse create(String orgId, String departmentId, ScheduleRequest request) {
        validateWindow(request);
        ClassInfo info = requireClass(orgId, request.classId());
        String teacherId = resolveTeacher(info, request.teacherId());
        validateRoom(orgId, info, request.roomId());

        ensureClassMirror(orgId, info, request);
        lockResources(orgId, teacherId, request.roomId());
        assertNoConflicts(orgId, teacherId, request.roomId(), request.classId(),
            request.startTime(), request.endTime(), null);

        String id = UUID.randomUUID().toString();
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("""
            INSERT INTO session(id, class_id, teacher_id, room_id, start_time, end_time, status,
                                department_id, created_at, updated_at)
            VALUES (?,?,?,?,?,?,'scheduled',?,?,?)
            """, id, request.classId(), teacherId, blankToNull(request.roomId()),
            Timestamp.from(request.startTime()), Timestamp.from(request.endTime()),
            departmentId, now, now);
        return requireSession(orgId, departmentId, id);
    }

    @Transactional
    public ScheduleResponse update(String orgId, String departmentId, String sessionId,
                                   ScheduleRequest request) {
        ScheduleResponse before = requireSession(orgId, departmentId, sessionId);
        if ("cancelled".equals(before.status())) {
            throw new AppException(ErrorCode.CONFLICT, "Cancelled sessions cannot be updated");
        }
        validateWindow(request);
        ClassInfo info = requireClass(orgId, request.classId());
        String teacherId = resolveTeacher(info, request.teacherId());
        validateRoom(orgId, info, request.roomId());

        ensureClassMirror(orgId, info, request);
        lockResources(orgId, teacherId, request.roomId());
        assertNoConflicts(orgId, teacherId, request.roomId(), request.classId(),
            request.startTime(), request.endTime(), sessionId);

        jdbc.update("""
            UPDATE session SET class_id=?, teacher_id=?, room_id=?, start_time=?, end_time=?, updated_at=?
            WHERE id=? AND department_id=? AND deleted_at IS NULL
            """, request.classId(), teacherId, blankToNull(request.roomId()),
            Timestamp.from(request.startTime()), Timestamp.from(request.endTime()),
            Timestamp.from(Instant.now()), sessionId, departmentId);
        return requireSession(orgId, departmentId, sessionId);
    }

    @Transactional
    public ScheduleResponse cancel(String orgId, String departmentId, String sessionId) {
        requireSession(orgId, departmentId, sessionId);
        jdbc.update("""
            UPDATE session SET status='cancelled', updated_at=?
            WHERE id=? AND department_id=? AND deleted_at IS NULL
            """, Timestamp.from(Instant.now()), sessionId, departmentId);
        return requireSession(orgId, departmentId, sessionId);
    }

    @Transactional
    public void delete(String orgId, String departmentId, String sessionId) {
        requireSession(orgId, departmentId, sessionId);
        jdbc.update("""
            UPDATE session SET deleted_at=?, updated_at=?
            WHERE id=? AND department_id=? AND deleted_at IS NULL
            """, Timestamp.from(Instant.now()), Timestamp.from(Instant.now()),
            sessionId, departmentId);
    }

    /** Lịch của chính giáo viên hoặc lớp của chính học sinh. */
    @Transactional(readOnly = true)
    public List<ScheduleResponse> mine(String orgId, String userId, String role,
                                       Instant from, Instant to) {
        if ("STUDENT".equals(role)) {
            List<StudentClass> classes = people.studentClasses(orgId, userId);
            if (classes.isEmpty()) return List.of();
            return byClasses(orgId, classes.stream().map(StudentClass::id).toList(), from, to);
        }
        return byTeacher(orgId, userId, from, to);
    }

    @Transactional(readOnly = true)
    public List<RoomSuggestionResponse> roomSuggestions(String orgId, String departmentId,
                                                         Instant startTime, Instant endTime) {
        Set<String> occupied = new HashSet<>();
        if (startTime != null && endTime != null) {
            occupied.addAll(jdbc.queryForList("""
                SELECT DISTINCT s.room_id FROM session s JOIN `class` c ON c.id=s.class_id
                WHERE c.org_id=? AND s.department_id=? AND s.room_id IS NOT NULL
                  AND s.deleted_at IS NULL AND s.status<>'cancelled'
                  AND s.start_time<? AND s.end_time>?
                """, String.class, orgId, departmentId,
                Timestamp.from(endTime), Timestamp.from(startTime)));
        }
        List<RoomSuggestionResponse> result = new ArrayList<>();
        for (RoomInfo room : facility.rooms(orgId, departmentId)) {
            if (!"active".equals(room.status())) continue;
            if (room.brokenEquipmentCount() > 0) continue;
            if (occupied.contains(room.id())) continue;
            result.add(new RoomSuggestionResponse(room.id(), room.code(), room.name(),
                room.capacity(), room.status()));
        }
        return result;
    }

    // --------------------------------------------------------------- helpers

    private List<ScheduleResponse> byTeacher(String orgId, String teacherId, Instant from, Instant to) {
        StringBuilder sql = new StringBuilder("""
            SELECT s.id, s.class_id, c.name AS class_name, s.teacher_id, s.room_id,
                   s.start_time, s.end_time, s.status, s.department_id
            FROM session s JOIN `class` c ON c.id=s.class_id
            WHERE c.org_id=? AND s.teacher_id=? AND s.deleted_at IS NULL AND c.deleted_at IS NULL
            """);
        List<Object> args = new ArrayList<>(List.of(orgId, teacherId));
        appendWindow(sql, args, from, to);
        sql.append(" ORDER BY s.start_time");
        return jdbc.query(sql.toString(), this::map, args.toArray());
    }

    private List<ScheduleResponse> byClasses(String orgId, List<String> classIds, Instant from, Instant to) {
        if (classIds.isEmpty()) return List.of();
        String placeholders = String.join(",", classIds.stream().map(id -> "?").toList());
        StringBuilder sql = new StringBuilder("""
            SELECT s.id, s.class_id, c.name AS class_name, s.teacher_id, s.room_id,
                   s.start_time, s.end_time, s.status, s.department_id
            FROM session s JOIN `class` c ON c.id=s.class_id
            WHERE c.org_id=? AND s.class_id IN (""" + placeholders + """
            ) AND s.deleted_at IS NULL AND c.deleted_at IS NULL
            """);
        List<Object> args = new ArrayList<>();
        args.add(orgId);
        args.addAll(classIds);
        appendWindow(sql, args, from, to);
        sql.append(" ORDER BY s.start_time");
        return jdbc.query(sql.toString(), this::map, args.toArray());
    }

    private void appendWindow(StringBuilder sql, List<Object> args, Instant from, Instant to) {
        if (from != null) {
            sql.append(" AND s.end_time>=?");
            args.add(Timestamp.from(from));
        }
        if (to != null) {
            sql.append(" AND s.start_time<=?");
            args.add(Timestamp.from(to));
        }
    }

    private ScheduleResponse map(java.sql.ResultSet rs, int row) throws java.sql.SQLException {
        return new ScheduleResponse(rs.getString("id"), rs.getString("class_id"),
            rs.getString("class_name"), rs.getString("teacher_id"), rs.getString("room_id"),
            rs.getTimestamp("start_time").toInstant(), rs.getTimestamp("end_time").toInstant(),
            rs.getString("status"), rs.getString("department_id"));
    }

    private ScheduleResponse requireSession(String orgId, String departmentId, String id) {
        List<ScheduleResponse> rows = jdbc.query("""
            SELECT s.id, s.class_id, c.name AS class_name, s.teacher_id, s.room_id,
                   s.start_time, s.end_time, s.status, s.department_id
            FROM session s JOIN `class` c ON c.id=s.class_id
            WHERE s.id=? AND c.org_id=? AND s.department_id=? AND s.deleted_at IS NULL
              AND c.deleted_at IS NULL
            """, this::map, id, orgId, departmentId);
        if (rows.isEmpty()) throw new AppException(ErrorCode.SCHEDULE_NOT_FOUND);
        return rows.get(0);
    }

    private void validateWindow(ScheduleRequest request) {
        if (request.startTime() == null || request.endTime() == null
            || !request.endTime().isAfter(request.startTime())) {
            throw new AppException(ErrorCode.INVALID_TIME_RANGE);
        }
    }

    private ClassInfo requireClass(String orgId, String classId) {
        ClassInfo info = people.classInfo(orgId, classId);
        if (info == null) throw new AppException(ErrorCode.CLASS_NOT_FOUND);
        if (CLASS_CANCELLED.equals(info.status()) || CLASS_FINISHED.equals(info.status())) {
            throw new AppException(ErrorCode.CLASS_NOT_SCHEDULABLE);
        }
        return info;
    }

    private String resolveTeacher(ClassInfo info, String requestedTeacherId) {
        if (requestedTeacherId != null && !requestedTeacherId.isBlank()) {
            if (info.teacherId() != null && !info.teacherId().equals(requestedTeacherId)) {
                throw new AppException(ErrorCode.TEACHER_NOT_ASSIGNED);
            }
            return requestedTeacherId;
        }
        if (info.teacherId() == null) throw new AppException(ErrorCode.TEACHER_NOT_ASSIGNED);
        return info.teacherId();
    }

    private void validateRoom(String orgId, ClassInfo info, String roomId) {
        if (roomId == null || roomId.isBlank()) return;
        RoomInfo room = facility.room(orgId, roomId);
        if (room == null) throw new AppException(ErrorCode.ROOM_NOT_AVAILABLE, "Room not found");
        if (!"active".equals(room.status())) throw new AppException(ErrorCode.ROOM_NOT_AVAILABLE);
        if (room.brokenEquipmentCount() > 0) {
            throw new AppException(ErrorCode.ROOM_NOT_AVAILABLE,
                "Room has broken equipment and cannot be scheduled");
        }
        if (info.studentCount() > room.capacity()) {
            throw new AppException(ErrorCode.ROOM_NOT_AVAILABLE, "Room capacity is too small");
        }
    }

    /** Schedule DB giữ bản sao lớp để hiển thị; People là nguồn chuẩn. */
    private void ensureClassMirror(String orgId, ClassInfo info, ScheduleRequest request) {
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM `class` WHERE id=? AND org_id=?", Integer.class,
            info.id(), orgId);
        String status = "CHUA_BAT_DAU".equals(info.status()) ? "draft" : "ongoing";
        LocalDate start = info.startDate() != null
            ? info.startDate() : request.startTime().atZone(java.time.ZoneOffset.UTC).toLocalDate();
        LocalDate end = info.endDate() != null ? info.endDate() : start.plusYears(1);
        Timestamp now = Timestamp.from(Instant.now());
        if (count != null && count > 0) {
            jdbc.update("""
                UPDATE `class` SET name=?, subject=?, status=?, start_date=?, end_date=?, updated_at=?
                WHERE id=? AND org_id=?
                """, info.name(), info.subjectName(), status, start, end, now, info.id(), orgId);
            return;
        }
        jdbc.update("""
            INSERT INTO `class`(id, org_id, code, name, subject, max_size, start_date, end_date,
                                status, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
            """, info.id(), orgId, info.classCode(), info.name(), info.subjectName(),
            Math.max(info.studentCount(), 1), start, end, status, now, now);
    }

    private void lockResources(String orgId, String teacherId, String roomId) {
        lock(orgId, "teacher", teacherId);
        if (roomId != null && !roomId.isBlank()) lock(orgId, "room", roomId);
    }

    private void lock(String orgId, String type, String resourceId) {
        Integer count = jdbc.queryForObject("""
            SELECT COUNT(*) FROM schedule_resource_lock
            WHERE org_id=? AND resource_type=? AND resource_id=?
            """, Integer.class, orgId, type, resourceId);
        if (count == null || count == 0) {
            try {
                jdbc.update("""
                    INSERT INTO schedule_resource_lock(org_id, resource_type, resource_id)
                    VALUES (?,?,?)
                    """, orgId, type, resourceId);
            } catch (DuplicateKeyException alreadyExists) {
                // another transaction created the lock row first
            }
        }
        jdbc.queryForList("""
            SELECT resource_id FROM schedule_resource_lock
            WHERE org_id=? AND resource_type=? AND resource_id=? FOR UPDATE
            """, String.class, orgId, type, resourceId);
    }

    private void assertNoConflicts(String orgId, String teacherId, String roomId, String classId,
                                   Instant start, Instant end, String excludeId) {
        if (countConflicts(orgId, "s.teacher_id", teacherId, start, end, excludeId) > 0) {
            throw new AppException(ErrorCode.TEACHER_SCHEDULE_CONFLICT);
        }
        if (roomId != null && !roomId.isBlank()
            && countConflicts(orgId, "s.room_id", roomId, start, end, excludeId) > 0) {
            throw new AppException(ErrorCode.ROOM_SCHEDULE_CONFLICT);
        }
        if (countConflicts(orgId, "s.class_id", classId, start, end, excludeId) > 0) {
            throw new AppException(ErrorCode.CLASS_SCHEDULE_CONFLICT);
        }
    }

    private int countConflicts(String orgId, String column, String value, Instant start, Instant end,
                               String excludeId) {
        String sql = """
            SELECT COUNT(*) FROM session s JOIN `class` c ON c.id=s.class_id
            WHERE c.org_id=? AND s.deleted_at IS NULL AND c.deleted_at IS NULL
              AND s.status<>'cancelled' AND %s=? AND s.start_time<? AND s.end_time>?
            """.formatted(column) + (excludeId == null ? "" : " AND s.id<>?");
        List<Object> args = new ArrayList<>(List.of(orgId, value,
            Timestamp.from(end), Timestamp.from(start)));
        if (excludeId != null) args.add(excludeId);
        Integer count = jdbc.queryForObject(sql, Integer.class, args.toArray());
        return count == null ? 0 : count;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
