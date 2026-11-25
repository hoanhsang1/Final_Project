package com.mems.repository;

import com.mems.dto.ResignationResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class ResignationRepository {
    private final JdbcTemplate jdbc;

    public ResignationRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void create(String id, String orgId, String userId, String departmentId, String reason,
                       String requestedBy) {
        jdbc.update("""
            INSERT INTO resignation_request(id,org_id,user_id,department_id,reason,status,
                requested_by,requested_at)
            VALUES (?,?,?,?,?,'PENDING',?,?)
            """, id, orgId, userId, departmentId, reason, requestedBy, Timestamp.from(Instant.now()));
    }

    public boolean hasPending(String orgId, String userId) {
        Integer count = jdbc.queryForObject("""
            SELECT COUNT(*) FROM resignation_request
            WHERE org_id=? AND user_id=? AND status='PENDING'
            """, Integer.class, orgId, userId);
        return count != null && count > 0;
    }

    public List<ResignationResponse> list(String orgId, String departmentId, String status) {
        StringBuilder sql = new StringBuilder(BASE_QUERY)
            .append(" WHERE r.org_id=? AND r.department_id=? ");
        List<Object> params = new ArrayList<>(List.of(orgId, departmentId));
        if (status != null && !status.isBlank()) {
            sql.append(" AND r.status=? ");
            params.add(status.trim().toUpperCase());
        }
        sql.append(" ORDER BY r.requested_at DESC, r.id ");
        return jdbc.query(sql.toString(), this::map, params.toArray());
    }

    /** Yêu cầu nghỉ việc của chính một nhân sự (tự phục vụ). */
    public List<ResignationResponse> mine(String orgId, String userId, String status) {
        StringBuilder sql = new StringBuilder(BASE_QUERY)
            .append(" WHERE r.org_id=? AND r.user_id=? ");
        List<Object> params = new ArrayList<>(List.of(orgId, userId));
        if (status != null && !status.isBlank()) {
            sql.append(" AND r.status=? ");
            params.add(status.trim().toUpperCase());
        }
        sql.append(" ORDER BY r.requested_at DESC, r.id ");
        return jdbc.query(sql.toString(), this::map, params.toArray());
    }

    /**
     * Toàn bộ yêu cầu trong tổ chức — dùng cho hộp duyệt hợp nhất. Bộ lọc thẩm
     * quyền (DEC-08) nằm ở {@link com.mems.service.ResignationApprovalPolicy};
     * truy vấn này cố ý không phụ thuộc quyền xem phòng ban/nhân sự.
     */
    public List<ResignationResponse> listOrg(String orgId, String status) {
        StringBuilder sql = new StringBuilder(BASE_QUERY)
            .append(" WHERE r.org_id=? ");
        List<Object> params = new ArrayList<>(List.of(orgId));
        if (status != null && !status.isBlank()) {
            sql.append(" AND r.status=? ");
            params.add(status.trim().toUpperCase());
        }
        sql.append(" ORDER BY r.requested_at DESC, r.id ");
        return jdbc.query(sql.toString(), this::map, params.toArray());
    }

    public Optional<ResignationResponse> find(String id, String orgId, String departmentId) {        var rows = jdbc.query(BASE_QUERY + """
             WHERE r.id=? AND r.org_id=? AND r.department_id=?
            """, this::map, id, orgId, departmentId);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    public ResignationResponse require(String id, String orgId, String departmentId) {
        return find(id, orgId, departmentId)
            .orElseThrow(() -> new AppException(ErrorCode.RESIGNATION_NOT_FOUND));
    }

    /** Khoá dòng request để hai người duyệt cùng lúc không cùng xử lý. */
    public ResignationResponse requireForUpdate(String id, String orgId, String departmentId) {
        var ids = jdbc.queryForList("""
            SELECT id FROM resignation_request
            WHERE id=? AND org_id=? AND department_id=? FOR UPDATE
            """, String.class, id, orgId, departmentId);
        if (ids.isEmpty()) throw new AppException(ErrorCode.RESIGNATION_NOT_FOUND);
        return require(id, orgId, departmentId);
    }

    /** Chỉ đổi trạng thái khi còn PENDING; 0 dòng = request đã được xử lý ở nơi khác. */
    public void decide(String id, String status, String actorId, String note) {
        int updated = jdbc.update("""
            UPDATE resignation_request
            SET status=?, decided_by=?, decided_at=?, decision_note=?
            WHERE id=? AND status='PENDING'
            """, status, actorId, Timestamp.from(Instant.now()), note, id);
        if (updated == 0) throw new AppException(ErrorCode.RESIGNATION_NOT_PENDING);
    }

    private static final String BASE_QUERY = """
        SELECT r.id, r.user_id, dm.username, sp.full_name, r.department_id, d.name AS department_name,
               r.reason, r.status,
               r.requested_by, rq.full_name AS requested_by_name, r.requested_at,
               r.decided_by, dc.full_name AS decided_by_name, r.decided_at, r.decision_note
        FROM resignation_request r
        LEFT JOIN department d ON d.id=r.department_id AND d.org_id=r.org_id
        LEFT JOIN department_member dm ON dm.user_id=r.user_id AND dm.org_id=r.org_id
        LEFT JOIN staff_profile sp ON sp.user_id=r.user_id AND sp.org_id=r.org_id
        LEFT JOIN staff_profile rq ON rq.user_id=r.requested_by AND rq.org_id=r.org_id
        LEFT JOIN staff_profile dc ON dc.user_id=r.decided_by AND dc.org_id=r.org_id
        """;

    private ResignationResponse map(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new ResignationResponse(
            rs.getString("id"), rs.getString("user_id"), rs.getString("username"),
            rs.getString("full_name"), rs.getString("department_id"), rs.getString("reason"),
            rs.getString("status"), rs.getString("requested_by"), rs.getString("requested_by_name"),
            instant(rs.getTimestamp("requested_at")), rs.getString("decided_by"),
            rs.getString("decided_by_name"), instant(rs.getTimestamp("decided_at")),
            rs.getString("department_name"), rs.getString("decision_note"));
    }

    private Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }
}
