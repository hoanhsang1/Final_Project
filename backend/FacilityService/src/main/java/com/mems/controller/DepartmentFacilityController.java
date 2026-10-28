package com.mems.controller;
import com.mems.security.Actor;
import com.mems.dto.FacilityResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/departments/{departmentId}/facilities")
public class DepartmentFacilityController {
    private final JdbcTemplate jdbc;
    private final Actor actor;
    public DepartmentFacilityController(JdbcTemplate jdbc,Actor actor) { this.jdbc=jdbc;this.actor=actor; }
    @GetMapping @PreAuthorize("hasRole('OWNER') or hasAuthority('FACILITY_MANAGE')")
    public List<FacilityResponse> list(@PathVariable String departmentId) {
        actor.requireDepartment(departmentId);
        return jdbc.query("""
            SELECT id,code,name,capacity,status FROM classroom
            WHERE org_id=? AND department_id=? AND deleted_at IS NULL ORDER BY name
            """,(rs,n) -> new FacilityResponse(rs.getString("id"),rs.getString("code"),rs.getString("name"),
                rs.getInt("capacity"),rs.getString("status")),actor.orgId(),departmentId);
    }
}
