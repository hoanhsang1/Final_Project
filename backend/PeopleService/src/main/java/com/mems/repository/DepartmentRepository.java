package com.mems.repository;
import com.mems.dto.DepartmentResponse;
import com.mems.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

@Repository
public class DepartmentRepository {
    private final JdbcTemplate jdbc;
    public DepartmentRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public List<DepartmentResponse> list(String orgId, String departmentId, boolean owner) {
        return jdbc.query("SELECT id,name,description,created_at FROM department WHERE org_id=?"
            + (owner ? "" : " AND id=?") + " ORDER BY name",
            (rs,n) -> new DepartmentResponse(rs.getString("id"),rs.getString("name"),
                rs.getString("description"),rs.getTimestamp("created_at").toInstant()),
            owner ? new Object[]{orgId} : new Object[]{orgId,departmentId});
    }
    public DepartmentResponse require(String id, String orgId, boolean lock) {
        var rows = jdbc.query("SELECT id,name,description,created_at FROM department WHERE id=? AND org_id=?"
            + (lock ? " FOR UPDATE" : ""),
            (rs,n) -> new DepartmentResponse(rs.getString("id"),rs.getString("name"),
                rs.getString("description"),rs.getTimestamp("created_at").toInstant()), id,orgId);
        if (rows.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND,"DEPARTMENT_NOT_FOUND","Department not found");
        return rows.get(0);
    }
    public DepartmentResponse create(String orgId, String name, String description) {
        String id = UUID.randomUUID().toString();
        Instant now = Instant.now();
        jdbc.update("INSERT INTO department(id,org_id,name,description,created_at) VALUES (?,?,?,?,?)",
            id,orgId,name,description,Timestamp.from(now));
        return require(id,orgId,false);
    }
    public DepartmentResponse update(String id,String orgId,String name,String description) {
        jdbc.update("UPDATE department SET name=?,description=? WHERE id=? AND org_id=?",name,description,id,orgId);
        return require(id,orgId,false);
    }
    public void delete(String id,String orgId) {
        Integer members = jdbc.queryForObject("SELECT COUNT(*) FROM department_member WHERE department_id=? AND org_id=?",
            Integer.class,id,orgId);
        if (members != null && members > 0)
            throw new ApiException(HttpStatus.CONFLICT,"DEPARTMENT_NOT_EMPTY","Remove department members first");
        jdbc.update("DELETE FROM department WHERE id=? AND org_id=?",id,orgId);
    }
}
