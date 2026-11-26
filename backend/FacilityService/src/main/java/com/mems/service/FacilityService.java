package com.mems.service;

import com.mems.dto.*;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.outbox.OutboxEventRepository;
import com.mems.outbox.OutboxEventTypes;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Phòng học, thiết bị và sự cố. Mọi truy vấn đều lọc `org_id` + `department_id`;
 * quyền được kiểm ở controller theo mã quyền và phạm vi.
 */
@Service
public class FacilityService {
    private static final Set<String> ROOM_TYPES = Set.of("classroom", "computer_room");
    private static final Set<String> ROOM_STATUSES = Set.of("active", "maintenance", "closed");
    private static final Set<String> EQUIPMENT_STATUSES =
        Set.of("in_use", "broken", "maintenance", "in_storage", "retired");
    private static final Set<String> ISSUE_STATUSES = Set.of("open", "in_progress", "resolved", "unresolved");

    private final JdbcTemplate jdbc;
    private final OutboxEventRepository outbox;

    public FacilityService(JdbcTemplate jdbc, OutboxEventRepository outbox) {
        this.jdbc = jdbc;
        this.outbox = outbox;
    }

    // ------------------------------------------------------------------ rooms

    @Transactional(readOnly = true)
    public List<RoomResponse> listRooms(String orgId, String departmentId) {
        return jdbc.query("""
            SELECT id, code, name, building, floor, capacity, room_type, status
            FROM classroom
            WHERE org_id=? AND department_id=? AND deleted_at IS NULL
            ORDER BY name
            """, (rs, n) -> new RoomResponse(rs.getString("id"), rs.getString("code"),
            rs.getString("name"), rs.getString("building"), rs.getString("floor"),
            rs.getInt("capacity"), rs.getString("room_type"), rs.getString("status")),
            orgId, departmentId);
    }

    @Transactional
    public RoomResponse createRoom(String orgId, String departmentId, RoomRequest request) {
        String type = normalize(request.roomType(), ROOM_TYPES, "classroom", ErrorCode.INVALID_ROOM_TYPE);
        String status = normalize(request.status(), ROOM_STATUSES, "active", ErrorCode.VALIDATION_ERROR);
        String id = UUID.randomUUID().toString();
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("""
            INSERT INTO classroom(id, org_id, department_id, code, name, building, floor, capacity,
                                  room_type, status, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            """, id, orgId, departmentId, request.code().trim(), request.name().trim(),
            trim(request.building()), trim(request.floor()), request.capacity(), type, status, now, now);
        return requireRoom(id, orgId, departmentId);
    }

    @Transactional
    public RoomResponse updateRoom(String orgId, String departmentId, String roomId, RoomRequest request) {
        String type = normalize(request.roomType(), ROOM_TYPES, "classroom", ErrorCode.INVALID_ROOM_TYPE);
        String status = normalize(request.status(), ROOM_STATUSES, "active", ErrorCode.VALIDATION_ERROR);
        int updated = jdbc.update("""
            UPDATE classroom SET code=?, name=?, building=?, floor=?, capacity=?, room_type=?, status=?, updated_at=?
            WHERE id=? AND org_id=? AND department_id=? AND deleted_at IS NULL
            """, request.code().trim(), request.name().trim(), trim(request.building()),
            trim(request.floor()), request.capacity(), type, status,
            Timestamp.from(Instant.now()), roomId, orgId, departmentId);
        if (updated == 0) throw new AppException(ErrorCode.ROOM_NOT_FOUND);
        return requireRoom(roomId, orgId, departmentId);
    }

    @Transactional
    public void deleteRoom(String orgId, String departmentId, String roomId) {
        RoomResponse room = requireRoom(roomId, orgId, departmentId);
        Integer activeEquipment = jdbc.queryForObject("""
            SELECT COUNT(*) FROM equipment
            WHERE room_id=? AND org_id=? AND deleted_at IS NULL AND status <> 'retired'
            """, Integer.class, room.id(), orgId);
        if (activeEquipment != null && activeEquipment > 0) throw new AppException(ErrorCode.ROOM_IN_USE);
        jdbc.update("""
            UPDATE classroom SET deleted_at=?, updated_at=?
            WHERE id=? AND org_id=? AND department_id=? AND deleted_at IS NULL
            """, Timestamp.from(Instant.now()), Timestamp.from(Instant.now()),
            roomId, orgId, departmentId);
    }

    // -------------------------------------------------------------- equipment

    @Transactional(readOnly = true)
    public List<EquipmentResponse> listEquipment(String orgId, String departmentId) {
        return jdbc.query("""
            SELECT e.id, e.asset_code, e.name, e.equipment_type, e.room_id,
                   c.name AS room_name, e.status, e.purchase_date
            FROM equipment e
            LEFT JOIN classroom c ON c.id=e.room_id AND c.org_id=e.org_id
            WHERE e.org_id=? AND e.department_id=? AND e.deleted_at IS NULL
            ORDER BY e.asset_code
            """, (rs, n) -> new EquipmentResponse(rs.getString("id"), rs.getString("asset_code"),
            rs.getString("name"), rs.getString("equipment_type"), rs.getString("room_id"),
            rs.getString("room_name"), rs.getString("status"),
            rs.getDate("purchase_date") == null ? null : rs.getDate("purchase_date").toLocalDate()),
            orgId, departmentId);
    }

    @Transactional
    public EquipmentResponse createEquipment(String orgId, String departmentId, EquipmentRequest request) {
        String roomId = requireRoomInDepartment(orgId, departmentId, request.roomId());
        String status = normalize(request.status(), EQUIPMENT_STATUSES, "in_use", ErrorCode.VALIDATION_ERROR);
        String id = UUID.randomUUID().toString();
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("""
            INSERT INTO equipment(id, org_id, department_id, room_id, asset_code, name,
                                  equipment_type, purchase_date, status, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
            """, id, orgId, departmentId, roomId, request.assetCode().trim(), request.name().trim(),
            trim(request.equipmentType()), request.purchaseDate(), status, now, now);
        return requireEquipment(id, orgId, departmentId);
    }

    @Transactional
    public EquipmentResponse updateEquipment(String orgId, String departmentId, String equipmentId,
                                             EquipmentRequest request, String changedBy) {
        EquipmentResponse before = requireEquipment(equipmentId, orgId, departmentId);
        String roomId = requireRoomInDepartment(orgId, departmentId, request.roomId());
        String status = normalize(request.status(), EQUIPMENT_STATUSES, before.status(), ErrorCode.VALIDATION_ERROR);
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("""
            UPDATE equipment SET asset_code=?, name=?, equipment_type=?, room_id=?, purchase_date=?, status=?, updated_at=?
            WHERE id=? AND org_id=? AND department_id=? AND deleted_at IS NULL
            """, request.assetCode().trim(), request.name().trim(), trim(request.equipmentType()),
            roomId, request.purchaseDate(), status, now, equipmentId, orgId, departmentId);
        if (!status.equals(before.status())) {
            logStatus(equipmentId, orgId, changedBy, before.status(), status, "Updated by facility management");
        }
        return requireEquipment(equipmentId, orgId, departmentId);
    }

    @Transactional
    public void deleteEquipment(String orgId, String departmentId, String equipmentId) {
        EquipmentResponse equipment = requireEquipment(equipmentId, orgId, departmentId);
        jdbc.update("""
            UPDATE equipment SET deleted_at=?, updated_at=?
            WHERE id=? AND org_id=? AND department_id=? AND deleted_at IS NULL
            """, Timestamp.from(Instant.now()), Timestamp.from(Instant.now()),
            equipment.id(), orgId, departmentId);
    }

    // ----------------------------------------------------------------- issues

    @Transactional(readOnly = true)
    public List<IssueResponse> listIssues(String orgId, String departmentId, String status) {
        boolean filtered = status != null && !status.isBlank();
        String sql = """
            SELECT i.id, i.equipment_id, e.name AS equipment_name, i.reported_by,
                   i.description, i.photo_url, i.status, i.resolved_at, i.created_at
            FROM incident_report i
            JOIN equipment e ON e.id=i.equipment_id AND e.org_id=i.org_id
            WHERE i.org_id=? AND e.department_id=? AND e.deleted_at IS NULL
            """ + (filtered ? " AND i.status=? " : "") + " ORDER BY i.created_at DESC";
        Object[] args = filtered
            ? new Object[]{orgId, departmentId, status}
            : new Object[]{orgId, departmentId};
        return jdbc.query(sql, (rs, n) -> new IssueResponse(rs.getString("id"),
            rs.getString("equipment_id"), rs.getString("equipment_name"), rs.getString("reported_by"),
            rs.getString("description"), rs.getString("photo_url"), rs.getString("status"),
            rs.getTimestamp("resolved_at") == null ? null : rs.getTimestamp("resolved_at").toInstant(),
            rs.getTimestamp("created_at").toInstant()), args);
    }

    @Transactional
    public IssueResponse reportIssue(String orgId, String departmentId, String userId,
                                     IssueReportRequest request) {
        EquipmentResponse equipment = requireEquipment(request.equipmentId(), orgId, departmentId);
        String id = UUID.randomUUID().toString();
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("""
            INSERT INTO incident_report(id, org_id, equipment_id, reported_by, description, photo_url,
                                        status, created_at, updated_at)
            VALUES (?,?,?,?,?,?, 'open', ?, ?)
            """, id, orgId, equipment.id(), userId, request.description().trim(),
            trim(request.photoUrl()), now, now);
        if (!"broken".equals(equipment.status())) {
            jdbc.update("UPDATE equipment SET status='broken', updated_at=? WHERE id=? AND org_id=?",
                now, equipment.id(), orgId);
            logStatus(equipment.id(), orgId, userId, equipment.status(), "broken", "Issue reported");
        }
        publishIncident(orgId, OutboxEventTypes.FACILITY_INCIDENT_OPENED, id, equipment,
            "open", Map.of("occurredAt", now.toInstant().toString()));
        return requireIssue(id, orgId, departmentId);
    }

    @Transactional
    public IssueResponse resolveIssue(String orgId, String departmentId, String userId, String issueId) {
        IssueResponse issue = requireIssue(issueId, orgId, departmentId);
        if ("resolved".equals(issue.status())) throw new AppException(ErrorCode.ISSUE_ALREADY_RESOLVED);
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("""
            UPDATE incident_report SET status='resolved', resolved_at=?, updated_at=?
            WHERE id=? AND org_id=?
            """, now, now, issueId, orgId);
        EquipmentResponse equipment = requireEquipment(issue.equipmentId(), orgId, departmentId);
        Integer openIssues = jdbc.queryForObject("""
            SELECT COUNT(*) FROM incident_report
            WHERE org_id=? AND equipment_id=? AND status='open'
            """, Integer.class, orgId, equipment.id());
        // FAC-01: chỉ khôi phục khi không còn sự cố mở, và về đúng trạng thái trước khi báo hỏng.
        if (openIssues != null && openIssues == 0 && "broken".equals(equipment.status())) {
            String restore = jdbc.query("""
                SELECT old_status FROM equipment_status_log
                WHERE equipment_id=? AND new_status='broken'
                ORDER BY changed_at DESC, id DESC LIMIT 1
                """, rs -> rs.next() ? rs.getString(1) : null, equipment.id());
            if (restore == null || restore.isBlank()) restore = "in_use";
            jdbc.update("UPDATE equipment SET status=?, updated_at=? WHERE id=? AND org_id=?",
                restore, now, equipment.id(), orgId);
            logStatus(equipment.id(), orgId, userId, "broken", restore, "Issue resolved");
        }
        publishIncident(orgId, OutboxEventTypes.FACILITY_INCIDENT_RESOLVED, issueId, equipment,
            "resolved", Map.of("resolvedAt", now.toInstant().toString()));
        return requireIssue(issueId, orgId, departmentId);
    }

    // ---------------------------------------------------------------- internal

    @Transactional(readOnly = true)
    public List<InternalRoomResponse> internalRooms(String orgId, String departmentId) {
        boolean byDepartment = departmentId != null && !departmentId.isBlank();
        String sql = """
            SELECT c.id, c.code, c.name, c.capacity, c.room_type, c.status, c.department_id,
                   (SELECT COUNT(*) FROM equipment e
                     WHERE e.room_id=c.id AND e.org_id=c.org_id AND e.deleted_at IS NULL
                       AND e.status='broken') AS broken_equipment
            FROM classroom c
            WHERE c.org_id=? AND c.deleted_at IS NULL
            """;
        List<Object> args = new ArrayList<>(List.of(orgId));
        if (byDepartment) {
            sql += " AND c.department_id=?";
            args.add(departmentId);
        }
        sql += " ORDER BY c.name";
        return jdbc.query(sql, (rs, n) -> new InternalRoomResponse(rs.getString("id"),
            rs.getString("code"), rs.getString("name"), rs.getInt("capacity"),
            rs.getString("status"), rs.getString("department_id"), rs.getInt("broken_equipment"),
            rs.getString("room_type")), args.toArray());
    }

    @Transactional(readOnly = true)
    public InternalRoomResponse internalRoom(String orgId, String roomId) {
        List<InternalRoomResponse> rows = jdbc.query("""
            SELECT c.id, c.code, c.name, c.capacity, c.room_type, c.status, c.department_id,
                   (SELECT COUNT(*) FROM equipment e
                     WHERE e.room_id=c.id AND e.org_id=c.org_id AND e.deleted_at IS NULL
                       AND e.status='broken') AS broken_equipment
            FROM classroom c
            WHERE c.id=? AND c.org_id=? AND c.deleted_at IS NULL
            """, (rs, n) -> new InternalRoomResponse(rs.getString("id"), rs.getString("code"),
            rs.getString("name"), rs.getInt("capacity"), rs.getString("status"),
            rs.getString("department_id"), rs.getInt("broken_equipment"),
            rs.getString("room_type")), roomId, orgId);
        if (rows.isEmpty()) throw new AppException(ErrorCode.ROOM_NOT_FOUND);
        return rows.get(0);
    }

    // ---------------------------------------------------------------- helpers

    /** SCH-04: chỉ phát event; Schedule đánh dấu buổi bị ảnh hưởng, không tự đổi phòng. */
    private void publishIncident(String orgId, String eventType, String incidentId,
                                 EquipmentResponse equipment, String status,
                                 Map<String, Object> extra) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("incidentId", incidentId);
        payload.put("equipmentId", equipment.id());
        payload.put("equipmentName", equipment.name());
        payload.put("roomId", equipment.roomId());
        payload.put("status", status);
        payload.putAll(extra);
        outbox.append(orgId, "FACILITY_INCIDENT", incidentId, null, eventType, 1,
            UUID.randomUUID().toString(), payload);
    }

    private RoomResponse requireRoom(String id, String orgId, String departmentId) {
        List<RoomResponse> rows = jdbc.query("""
            SELECT id, code, name, building, floor, capacity, room_type, status
            FROM classroom WHERE id=? AND org_id=? AND department_id=? AND deleted_at IS NULL
            """, (rs, n) -> new RoomResponse(rs.getString("id"), rs.getString("code"),
            rs.getString("name"), rs.getString("building"), rs.getString("floor"),
            rs.getInt("capacity"), rs.getString("room_type"), rs.getString("status")),
            id, orgId, departmentId);
        if (rows.isEmpty()) throw new AppException(ErrorCode.ROOM_NOT_FOUND);
        return rows.get(0);
    }

    private EquipmentResponse requireEquipment(String id, String orgId, String departmentId) {
        List<EquipmentResponse> rows = jdbc.query("""
            SELECT e.id, e.asset_code, e.name, e.equipment_type, e.room_id,
                   c.name AS room_name, e.status, e.purchase_date
            FROM equipment e
            LEFT JOIN classroom c ON c.id=e.room_id AND c.org_id=e.org_id
            WHERE e.id=? AND e.org_id=? AND e.department_id=? AND e.deleted_at IS NULL
            """, (rs, n) -> new EquipmentResponse(rs.getString("id"), rs.getString("asset_code"),
            rs.getString("name"), rs.getString("equipment_type"), rs.getString("room_id"),
            rs.getString("room_name"), rs.getString("status"),
            rs.getDate("purchase_date") == null ? null : rs.getDate("purchase_date").toLocalDate()),
            id, orgId, departmentId);
        if (rows.isEmpty()) throw new AppException(ErrorCode.EQUIPMENT_NOT_FOUND);
        return rows.get(0);
    }

    private IssueResponse requireIssue(String id, String orgId, String departmentId) {
        List<IssueResponse> rows = jdbc.query("""
            SELECT i.id, i.equipment_id, e.name AS equipment_name, i.reported_by,
                   i.description, i.photo_url, i.status, i.resolved_at, i.created_at
            FROM incident_report i
            JOIN equipment e ON e.id=i.equipment_id AND e.org_id=i.org_id
            WHERE i.id=? AND i.org_id=? AND e.department_id=? AND e.deleted_at IS NULL
            """, (rs, n) -> new IssueResponse(rs.getString("id"),
            rs.getString("equipment_id"), rs.getString("equipment_name"), rs.getString("reported_by"),
            rs.getString("description"), rs.getString("photo_url"), rs.getString("status"),
            rs.getTimestamp("resolved_at") == null ? null : rs.getTimestamp("resolved_at").toInstant(),
            rs.getTimestamp("created_at").toInstant()), id, orgId, departmentId);
        if (rows.isEmpty()) throw new AppException(ErrorCode.ISSUE_NOT_FOUND);
        return rows.get(0);
    }

    /** `null` → cho phép thiết bị chưa gán phòng; có phòng thì phải cùng org + phòng ban. */
    private String requireRoomInDepartment(String orgId, String departmentId, String roomId) {
        if (roomId == null || roomId.isBlank()) return null;
        return requireRoom(roomId, orgId, departmentId).id();
    }

    private void logStatus(String equipmentId, String orgId, String changedBy,
                           String oldStatus, String newStatus, String reason) {
        if (changedBy == null || changedBy.isBlank()) return;
        jdbc.update("""
            INSERT INTO equipment_status_log(id, equipment_id, changed_by, old_status, new_status, reason, changed_at)
            VALUES (?,?,?,?,?,?,?)
            """, UUID.randomUUID().toString(), equipmentId, changedBy, oldStatus, newStatus, reason,
            Timestamp.from(Instant.now()));
    }

    private String normalize(String value, Set<String> allowed, String fallback, ErrorCode errorCode) {
        if (value == null || value.isBlank()) return fallback;
        if (!allowed.contains(value)) throw new AppException(errorCode);
        return value;
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }
}
