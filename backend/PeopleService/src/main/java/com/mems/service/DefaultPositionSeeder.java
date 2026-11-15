package com.mems.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;

/**
 * Seeds the Sprint 4 default positions once per organization.
 *
 * <p>The permission codes mirror IdentityService's {@code PermissionCatalog}; PeopleService must not
 * call IdentityService during startup because it may not be up yet.</p>
 */
@Service
public class DefaultPositionSeeder {
    private static final Logger log = LoggerFactory.getLogger(DefaultPositionSeeder.class);

    // Keep in sync with IdentityService PermissionCatalog.ENTRIES.
    private static final Set<String> ALL_PERMISSIONS = Set.of(
        "employee.view", "employee.create", "employee.edit", "employee.delete",
        "employee.reset_password", "employee.assign_position", "position.view", "position.manage",
        "department.view", "department.manage",
        "student.view", "student.create", "student.edit", "student.delete",
        "class.view", "class.create", "class.edit", "class.delete", "class.assign_teacher",
        "class.cancel", "class.request_close", "class.approve_close", "class.reopen",
        "schedule.view", "schedule.create", "schedule.edit", "schedule.update",
        "schedule.cancel_session", "schedule.delete",
        "facility.view", "facility.manage",
        "facility.room.view", "facility.room.create", "facility.room.update", "facility.room.delete",
        "facility.equipment.view", "facility.equipment.create", "facility.equipment.update",
        "facility.equipment.delete", "facility.issue.report", "facility.issue.resolve"
    );

    private record DefaultPosition(String name, String description, String profileType,
                                   String scope, Set<String> permissions, Set<String> bundles) {}

    private static final List<DefaultPosition> DEFAULTS = List.of(
        new DefaultPosition("Quản trị viên tổ chức", "Quản trị toàn bộ tổ chức", "GENERAL",
            "ORGANIZATION", ALL_PERMISSIONS,
            Set.of("HR_MANAGEMENT", "ACADEMIC_MANAGEMENT", "SCHEDULE_MANAGEMENT", "FACILITY_MANAGEMENT")),
        new DefaultPosition("Giáo vụ", "Quản lý lớp học và sinh viên", "GENERAL",
            "ORGANIZATION", Set.of(
                "class.view", "class.create", "class.edit", "class.assign_teacher", "class.cancel",
                "class.request_close", "student.view", "student.create", "student.edit", "student.delete"),
            Set.of("ACADEMIC_MANAGEMENT")),
        new DefaultPosition("Giáo viên", "Giáo viên giảng dạy", "TEACHER",
            "DEPARTMENT", Set.of("class.view", "student.view", "schedule.view"), Set.of()),
        new DefaultPosition("Trưởng phòng ban", "Phê duyệt đóng lớp trong phòng ban", "GENERAL",
            "DEPARTMENT", Set.of("class.view", "class.approve_close", "class.reopen"), Set.of()),
        // Must contain the teacher position's permissions so a MANAGER can assign it (MembershipPolicy).
        new DefaultPosition("Nhân sự phòng ban", "Quản lý nhân sự trong phòng ban", "GENERAL",
            "DEPARTMENT", Set.of(
                "employee.view", "employee.create", "employee.edit", "employee.delete",
                "employee.reset_password", "employee.assign_position", "position.view", "position.manage",
                "department.view", "class.view", "student.view", "schedule.view"),
            Set.of("HR_MANAGEMENT")),
        new DefaultPosition("Nhân viên cơ sở vật chất", "Quản lý cơ sở vật chất", "GENERAL",
            "DEPARTMENT", Set.of("facility.view", "facility.manage",
                "facility.room.view", "facility.room.create", "facility.room.update", "facility.room.delete",
                "facility.equipment.view", "facility.equipment.create", "facility.equipment.update",
                "facility.equipment.delete", "facility.issue.report", "facility.issue.resolve"),
            Set.of("FACILITY_MANAGEMENT")),
        new DefaultPosition("Nhân viên", "Nhân viên chung", "GENERAL",
            "DEPARTMENT", Set.of(), Set.of())
    );

    private final JdbcTemplate jdbc;

    public DefaultPositionSeeder(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Seeds defaults for one organization. The marker row makes this a one-time operation:
     * positions deleted or edited afterwards are never recreated or overwritten.
     */
    @Transactional
    public void ensureForOrg(String orgId) {
        if (orgId == null || orgId.isBlank()) return;
        Integer seeded = jdbc.queryForObject(
            "SELECT COUNT(*) FROM position_seed WHERE org_id=?", Integer.class, orgId);
        if (seeded != null && seeded > 0) return;
        try {
            jdbc.update("INSERT INTO position_seed(org_id, seeded_at) VALUES (?, ?)",
                orgId, Timestamp.from(Instant.now()));
        } catch (DuplicateKeyException alreadySeeded) {
            return;
        }
        for (DefaultPosition definition : DEFAULTS) {
            seedPosition(orgId, definition);
        }
        log.info("Seeded {} default position(s) for organization {}", DEFAULTS.size(), orgId);
    }

    /** Seeds every organization already known to PeopleService. */
    @Transactional
    public void ensureForAllOrganizations() {
        Set<String> orgIds = new TreeSet<>();
        orgIds.addAll(jdbc.queryForList("SELECT DISTINCT org_id FROM department", String.class));
        orgIds.addAll(jdbc.queryForList("SELECT DISTINCT org_id FROM `position`", String.class));
        orgIds.forEach(this::ensureForOrg);
    }

    private void seedPosition(String orgId, DefaultPosition definition) {
        Integer existing = jdbc.queryForObject(
            "SELECT COUNT(*) FROM `position` WHERE org_id=? AND name=?",
            Integer.class, orgId, definition.name());
        if (existing != null && existing > 0) return;

        String id = UUID.randomUUID().toString();
        jdbc.update(
            "INSERT INTO `position`(id, org_id, name, description, created_at, profile_type, scope) VALUES (?,?,?,?,?,?,?)",
            id, orgId, definition.name(), definition.description(), Timestamp.from(Instant.now()),
            definition.profileType(), definition.scope());
        new TreeSet<>(definition.permissions()).forEach(code -> jdbc.update(
            "INSERT INTO position_permission(position_id, permission_code) VALUES (?, ?)", id, code));
        new TreeSet<>(definition.bundles()).forEach(code -> jdbc.update(
            "INSERT INTO position_bundle(position_id, bundle_code) VALUES (?, ?)", id, code));
    }
}
