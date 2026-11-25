package com.mems.repository;

import com.mems.dto.TransferResponse;
import com.mems.dto.TransferStepResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

/**
 * Truy vấn yêu cầu chuyển phòng và 4 bước duyệt.
 *
 * <p>Bảng {@code transfer_request} được khoá bằng {@code SELECT ... FOR UPDATE}
 * khi quyết định để hai người không xử lý cùng một bước.</p>
 */
@Repository
public class TransferRepository {
    public static final List<String> STEPS = List.of("SOURCE_HEAD", "TARGET_HEAD", "HR", "EMPLOYEE");

    private final JdbcTemplate jdbc;

    public TransferRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void create(String id, String orgId, String userId, String fromDepartmentId,
                       String toDepartmentId, String reason, String requestedBy) {
        jdbc.update("""
            INSERT INTO transfer_request(id, org_id, user_id, from_department_id, to_department_id,
                reason, status, requested_by, requested_at)
            VALUES (?,?,?,?,?,?,'PENDING',?,?)
            """, id, orgId, userId, fromDepartmentId, toDepartmentId, reason, requestedBy,
            Timestamp.from(Instant.now()));
        for (String step : STEPS) {
            jdbc.update("""
                INSERT INTO transfer_approval(id, org_id, request_id, step, decision)
                VALUES (?,?,?,?,'PENDING')
                """, UUID.randomUUID().toString(), orgId, id, step);
        }
    }

    /** Phòng ban hiện tại (đang ACTIVE) của nhân sự — mỗi người chỉ thuộc một phòng. */
    public Optional<String> currentDepartment(String orgId, String userId) {
        var rows = jdbc.queryForList("""
            SELECT department_id FROM department_member
            WHERE user_id=? AND org_id=? AND status='ACTIVE'
            """, String.class, userId, orgId);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    public boolean hasPending(String orgId, String userId) {
        Integer count = jdbc.queryForObject("""
            SELECT COUNT(*) FROM transfer_request
            WHERE org_id=? AND user_id=? AND status='PENDING'
            """, Integer.class, orgId, userId);
        return count != null && count > 0;
    }

    public List<TransferResponse> listPending(String orgId) {
        return attachSteps(jdbc.query(BASE_QUERY + """
             WHERE t.org_id=? AND t.status='PENDING'
             ORDER BY t.requested_at, t.id
            """, this::map, orgId));
    }

    /** Yêu cầu mà người dùng là người được chuyển hoặc người khởi tạo. */
    public List<TransferResponse> listRelated(String orgId, String userId) {
        return attachSteps(jdbc.query(BASE_QUERY + """
             WHERE t.org_id=? AND (t.user_id=? OR t.requested_by=?)
             ORDER BY t.requested_at DESC, t.id
            """, this::map, orgId, userId, userId));
    }

    public Optional<TransferResponse> find(String id, String orgId) {
        var rows = jdbc.query(BASE_QUERY + " WHERE t.id=? AND t.org_id=?", this::map, id, orgId);
        return rows.isEmpty() ? Optional.empty() : Optional.of(attachSteps(rows).get(0));
    }

    public TransferResponse require(String id, String orgId) {
        return find(id, orgId).orElseThrow(() -> new AppException(ErrorCode.TRANSFER_NOT_FOUND));
    }

    public TransferResponse requireForUpdate(String id, String orgId) {
        var ids = jdbc.queryForList("""
            SELECT id FROM transfer_request WHERE id=? AND org_id=? FOR UPDATE
            """, String.class, id, orgId);
        if (ids.isEmpty()) throw new AppException(ErrorCode.TRANSFER_NOT_FOUND);
        return require(id, orgId);
    }

    /** Trả về false khi bước đã được người khác quyết định trước. */
    public boolean decideStep(String requestId, String step, String decision, String actorId, String note) {
        return jdbc.update("""
            UPDATE transfer_approval
            SET decision=?, decided_by=?, decided_at=?, note=?
            WHERE request_id=? AND step=? AND decision='PENDING'
            """, decision, actorId, Timestamp.from(Instant.now()), note, requestId, step) > 0;
    }

    public void markApplied(String id, String actorId) {
        jdbc.update("""
            UPDATE transfer_request SET status='APPROVED', applied_at=?, applied_by=?
            WHERE id=? AND status='PENDING'
            """, Timestamp.from(Instant.now()), actorId, id);
    }

    public boolean cancel(String id, String actorId) {
        return jdbc.update("""
            UPDATE transfer_request SET status='CANCELLED', applied_at=?, applied_by=?
            WHERE id=? AND status='PENDING'
            """, Timestamp.from(Instant.now()), actorId, id) > 0;
    }

    public void rejectRequest(String id) {
        jdbc.update("UPDATE transfer_request SET status='REJECTED' WHERE id=? AND status='PENDING'", id);
    }

    /** Người đang giữ chức danh trưởng phòng (scope DEPARTMENT) của phòng. */
    public Set<String> headHolders(String orgId, String departmentId,
                                   Collection<String> headPositionNames) {
        List<String> names = headPositionNames == null ? List.of()
            : headPositionNames.stream().filter(Objects::nonNull).distinct().toList();
        if (names.isEmpty()) return Set.of();
        List<Object> params = new ArrayList<>();
        params.add(orgId);
        params.add(departmentId);
        params.add(com.mems.service.PositionSystemCodes.DEPT_HEAD);
        params.addAll(names);
        Timestamp now = Timestamp.from(Instant.now());
        params.add(now);
        params.add(now);
        return new TreeSet<>(jdbc.queryForList("""
            SELECT DISTINCT a.user_id
            FROM assignment a
            JOIN `position` p ON p.id=a.position_id AND p.org_id=a.org_id AND p.deleted_at IS NULL
            WHERE a.org_id=? AND a.status='ACTIVE'
              AND a.scope_type='DEPARTMENT' AND a.department_id=?
              AND (p.system_code=? OR p.name IN (""" + String.join(",", Collections.nCopies(names.size(), "?")) + """
              ))
              AND a.effective_from<=? AND (a.effective_to IS NULL OR a.effective_to>=?)
            """, String.class, params.toArray()));
    }

    /** Người dùng có đang giữ chức danh trưởng phòng ở bất kỳ phòng ban nào không. */
    public boolean isHead(String orgId, String userId, Collection<String> headPositionNames) {
        List<String> names = headPositionNames == null ? List.of()
            : headPositionNames.stream().filter(Objects::nonNull).distinct().toList();
        if (names.isEmpty()) return false;
        List<Object> params = new ArrayList<>(List.of(orgId, userId));
        params.add(com.mems.service.PositionSystemCodes.DEPT_HEAD);
        params.addAll(names);
        Timestamp now = Timestamp.from(Instant.now());
        params.add(now);
        params.add(now);
        Integer count = jdbc.queryForObject("""
            SELECT COUNT(*)
            FROM assignment a
            JOIN `position` p ON p.id=a.position_id AND p.org_id=a.org_id AND p.deleted_at IS NULL
            WHERE a.org_id=? AND a.user_id=? AND a.status='ACTIVE'
              AND a.scope_type='DEPARTMENT'
              AND (p.system_code=? OR p.name IN (""" + String.join(",", Collections.nCopies(names.size(), "?")) + """
              ))
              AND a.effective_from<=? AND (a.effective_to IS NULL OR a.effective_to>=?)
            """, Integer.class, params.toArray());
        return count != null && count > 0;
    }

    /**
     * Người có assignment ACTIVE trong phạm vi ORGANIZATION hoặc một trong các
     * phòng ban truyền vào — ứng viên để service lọc tiếp theo quyền hiệu lực.
     * Bundle nằm ở IdentityService nên không thể join trực tiếp tại đây.
     */
    public Set<String> assignmentHolders(String orgId, Collection<String> departmentIds) {
        List<String> depts = departmentIds == null ? List.of()
            : departmentIds.stream().filter(Objects::nonNull).distinct().toList();
        StringBuilder scope = new StringBuilder("scope_type='ORGANIZATION'");
        List<Object> params = new ArrayList<>();
        params.add(orgId);
        if (!depts.isEmpty()) {
            scope.append(" OR department_id IN (")
                .append(String.join(",", Collections.nCopies(depts.size(), "?"))).append(")");
            params.addAll(depts);
        }
        return new TreeSet<>(jdbc.queryForList(
            "SELECT DISTINCT user_id FROM assignment"
                + " WHERE org_id=? AND status='ACTIVE' AND (" + scope + ")",
            String.class, params.toArray()));
    }

    /** TRF-04: nạp bước duyệt cho cả danh sách bằng một truy vấn thay vì N+1. */
    private List<TransferResponse> attachSteps(List<TransferResponse> rows) {
        if (rows.isEmpty()) return rows;
        String in = String.join(",", Collections.nCopies(rows.size(), "?"));
        Map<String, List<TransferStepResponse>> grouped = new HashMap<>();
        jdbc.query("""
            SELECT a.request_id, a.step, a.decision, a.decided_by, sp.full_name AS decided_by_name,
                   a.decided_at, a.note
            FROM transfer_approval a
            LEFT JOIN staff_profile sp ON sp.user_id=a.decided_by AND sp.org_id=a.org_id
            WHERE a.request_id IN (""" + in + """
            )
            ORDER BY a.request_id, CASE a.step
                WHEN 'SOURCE_HEAD' THEN 1 WHEN 'TARGET_HEAD' THEN 2
                WHEN 'HR' THEN 3 ELSE 4 END
            """, rs -> {
                grouped.computeIfAbsent(rs.getString("request_id"), k -> new ArrayList<>())
                    .add(new TransferStepResponse(
                        rs.getString("step"), rs.getString("decision"), rs.getString("decided_by"),
                        rs.getString("decided_by_name"), instant(rs.getTimestamp("decided_at")),
                        rs.getString("note")));
            }, rows.stream().map(TransferResponse::id).toArray());
        return rows.stream()
            .map(row -> row.withSteps(grouped.getOrDefault(row.id(), List.of())))
            .toList();
    }

    private static final String BASE_QUERY = """
        SELECT t.id, t.user_id, dm.username, sp.full_name,
               t.from_department_id, df.name AS from_department_name,
               t.to_department_id, dt.name AS to_department_name,
               t.reason, t.status, t.requested_by, rq.full_name AS requested_by_name,
               t.requested_at, t.applied_at, t.applied_by
        FROM transfer_request t
        LEFT JOIN department_member dm ON dm.user_id=t.user_id AND dm.org_id=t.org_id
        LEFT JOIN staff_profile sp ON sp.user_id=t.user_id AND sp.org_id=t.org_id
        LEFT JOIN staff_profile rq ON rq.user_id=t.requested_by AND rq.org_id=t.org_id
        LEFT JOIN department df ON df.id=t.from_department_id AND df.org_id=t.org_id
        LEFT JOIN department dt ON dt.id=t.to_department_id AND dt.org_id=t.org_id
        """;

    private TransferResponse map(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new TransferResponse(
            rs.getString("id"), rs.getString("user_id"), rs.getString("username"), rs.getString("full_name"),
            rs.getString("from_department_id"), rs.getString("from_department_name"),
            rs.getString("to_department_id"), rs.getString("to_department_name"),
            rs.getString("reason"), rs.getString("status"),
            rs.getString("requested_by"), rs.getString("requested_by_name"),
            instant(rs.getTimestamp("requested_at")), instant(rs.getTimestamp("applied_at")),
            rs.getString("applied_by"), List.of(), List.of());
    }

    private Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }
}
