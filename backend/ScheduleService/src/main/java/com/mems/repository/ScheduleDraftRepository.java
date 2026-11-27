package com.mems.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Bảng lịch nháp. Mọi truy vấn đều xác thực `org_id` (trực tiếp ở schedule_draft,
 * hoặc qua join khi đọc item/mục chưa xếp) và không bao giờ ghi `session`.
 */
@Repository
public class ScheduleDraftRepository {
    private final JdbcTemplate jdbc;

    public ScheduleDraftRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ------------------------------------------------------------------ draft

    public void insertDraft(String id, String orgId, String departmentId, String paramsJson,
                            String summaryJson, String createdBy, Instant now) {
        jdbc.update("""
            INSERT INTO schedule_draft(id, org_id, department_id, status, params, summary,
                                       created_by, created_at)
            VALUES (?,?,?,'DRAFT',?,?,?,?)
            """, id, orgId, departmentId, paramsJson, summaryJson, createdBy,
            Timestamp.from(now));
    }

    public DraftRow findDraft(String orgId, String departmentId, String draftId) {
        List<DraftRow> rows = jdbc.query("""
            SELECT id, org_id, department_id, status, params, summary, created_by,
                   created_at, confirmed_at
            FROM schedule_draft WHERE org_id=? AND department_id=? AND id=?
            """, this::mapDraft, orgId, departmentId, draftId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    /** Khoá dòng nháp để chống xác nhận/huỷ song song. */
    public DraftRow lockDraft(String orgId, String departmentId, String draftId) {
        List<DraftRow> rows = jdbc.query("""
            SELECT id, org_id, department_id, status, params, summary, created_by,
                   created_at, confirmed_at
            FROM schedule_draft WHERE org_id=? AND department_id=? AND id=? FOR UPDATE
            """, this::mapDraft, orgId, departmentId, draftId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public List<DraftRow> listDrafts(String orgId, String departmentId, String status) {
        StringBuilder sql = new StringBuilder("""
            SELECT id, org_id, department_id, status, params, summary, created_by,
                   created_at, confirmed_at
            FROM schedule_draft WHERE org_id=? AND department_id=?
            """);
        List<Object> args = new ArrayList<>(List.of(orgId, departmentId));
        if (status != null && !status.isBlank()) {
            sql.append(" AND status=?");
            args.add(status);
        }
        sql.append(" ORDER BY created_at DESC");
        return jdbc.query(sql.toString(), this::mapDraft, args.toArray());
    }

    public void markConfirmed(String orgId, String draftId, Instant confirmedAt) {
        jdbc.update("""
            UPDATE schedule_draft SET status='CONFIRMED', confirmed_at=?, updated_at=?
            WHERE org_id=? AND id=?
            """, Timestamp.from(confirmedAt), Timestamp.from(confirmedAt), orgId, draftId);
    }

    public void markDiscarded(String orgId, String draftId, Instant now) {
        jdbc.update("""
            UPDATE schedule_draft SET status='DISCARDED', updated_at=?
            WHERE org_id=? AND id=?
            """, Timestamp.from(now), orgId, draftId);
    }

    // ------------------------------------------------------------------- item

    public void insertItem(ItemRow item) {
        jdbc.update("""
            INSERT INTO schedule_draft_item(id, draft_id, class_id, subject_id, teacher_id,
                                            teacher_name, room_id, room_code, subject_name,
                                            start_time, end_time, week_no, is_exception,
                                            exception_type, exception_reason, is_manual_edit)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, item.id(), item.draftId(), item.classId(), item.subjectId(), item.teacherId(),
            item.teacherName(), item.roomId(), item.roomCode(), item.subjectName(),
            Timestamp.from(item.start()), Timestamp.from(item.end()), item.weekNo(),
            item.exception(), item.exceptionType(), item.exceptionReason(), item.manualEdit());
    }

    public ItemRow findItem(String orgId, String draftId, String itemId) {
        List<ItemRow> rows = jdbc.query("""
            SELECT i.* FROM schedule_draft_item i
            JOIN schedule_draft d ON d.id=i.draft_id
            WHERE d.org_id=? AND i.draft_id=? AND i.id=?
            """, this::mapItem, orgId, draftId, itemId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public List<ItemRow> listItems(String orgId, String draftId) {
        return jdbc.query("""
            SELECT i.* FROM schedule_draft_item i
            JOIN schedule_draft d ON d.id=i.draft_id
            WHERE d.org_id=? AND i.draft_id=?
            ORDER BY i.start_time, i.class_id, i.id
            """, this::mapItem, orgId, draftId);
    }

    public void updateItem(String orgId, String draftId, String itemId, String roomId,
                           String roomCode, String teacherId, String teacherName,
                           Instant start, Instant end) {
        jdbc.update("""
            UPDATE schedule_draft_item
            SET room_id=?, room_code=?, teacher_id=?, teacher_name=?,
                start_time=?, end_time=?, is_manual_edit=TRUE
            WHERE id=? AND draft_id IN (
                SELECT d.id FROM schedule_draft d WHERE d.org_id=? AND d.id=?
            )
            """, roomId, roomCode, teacherId, teacherName,
            Timestamp.from(start), Timestamp.from(end), itemId, orgId, draftId);
    }

    // ------------------------------------------------------------ unscheduled

    public void insertUnscheduled(String id, String draftId, String classId, String subjectId,
                                  Integer sessionNo, String reason) {
        jdbc.update("""
            INSERT INTO schedule_draft_unscheduled(id, draft_id, class_id, subject_id,
                                                   session_no, reason)
            VALUES (?,?,?,?,?,?)
            """, id, draftId, classId, subjectId, sessionNo, reason);
    }

    public List<UnscheduledRow> listUnscheduled(String orgId, String draftId) {
        return jdbc.query("""
            SELECT u.id, u.class_id, u.subject_id, u.session_no, u.reason
            FROM schedule_draft_unscheduled u
            JOIN schedule_draft d ON d.id=u.draft_id
            WHERE d.org_id=? AND u.draft_id=?
            ORDER BY u.class_id, u.subject_id, u.session_no
            """, (rs, row) -> new UnscheduledRow(rs.getString("id"),
            rs.getString("class_id"), rs.getString("subject_id"),
            (Integer) rs.getObject("session_no"), rs.getString("reason")),
            orgId, draftId);
    }

    // ------------------------------------------------------------------ maps

    private DraftRow mapDraft(java.sql.ResultSet rs, int row) throws java.sql.SQLException {
        return new DraftRow(rs.getString("id"), rs.getString("org_id"),
            rs.getString("department_id"), rs.getString("status"), rs.getString("params"),
            rs.getString("summary"), rs.getString("created_by"),
            toInstant(rs.getTimestamp("created_at")), toInstant(rs.getTimestamp("confirmed_at")));
    }

    private ItemRow mapItem(java.sql.ResultSet rs, int row) throws java.sql.SQLException {
        return new ItemRow(rs.getString("id"), rs.getString("draft_id"),
            rs.getString("class_id"), rs.getString("subject_id"), rs.getString("teacher_id"),
            rs.getString("teacher_name"), rs.getString("room_id"), rs.getString("room_code"),
            rs.getString("subject_name"), toInstant(rs.getTimestamp("start_time")),
            toInstant(rs.getTimestamp("end_time")), rs.getInt("week_no"),
            rs.getBoolean("is_exception"), rs.getString("exception_type"),
            rs.getString("exception_reason"), rs.getBoolean("is_manual_edit"));
    }

    private Instant toInstant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    public record DraftRow(String id, String orgId, String departmentId, String status,
                           String params, String summary, String createdBy,
                           Instant createdAt, Instant confirmedAt) {}

    public record ItemRow(String id, String draftId, String classId, String subjectId,
                          String teacherId, String teacherName, String roomId, String roomCode,
                          String subjectName, Instant start, Instant end, int weekNo,
                          boolean exception, String exceptionType, String exceptionReason,
                          boolean manualEdit) {}

    public record UnscheduledRow(String id, String classId, String subjectId, Integer sessionNo,
                                 String reason) {}
}
