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
        "FACILITY_MANAGE", "SCHEDULE_CREATE", "SCHEDULE_VIEW",
        "PEOPLE_VIEW", "PEOPLE_EDIT",
        "STUDENT_VIEW", "STUDENT_CREATE", "STUDENT_EDIT", "STUDENT_DELETE",
        "CLASS_VIEW", "CLASS_CREATE", "CLASS_EDIT", "CLASS_DELETE",
        "CLASS_ASSIGN_TEACHER", "CLASS_CANCEL", "CLASS_CLOSE_REQUEST",
        "CLASS_CLOSE_APPROVE", "CLASS_REOPEN"
    );

    private record DefaultPosition(String name, String description, String profileType, Set<String> permissions) {}

    private static final List<DefaultPosition> DEFAULTS = List.of(
        new DefaultPosition("Quản trị viên tổ chức", "Quản trị toàn bộ tổ chức", "GENERAL", ALL_PERMISSIONS),
        new DefaultPosition("Giáo vụ", "Quản lý lớp học và sinh viên",
            "GENERAL", Set.of(
                "CLASS_VIEW", "CLASS_CREATE", "CLASS_EDIT", "CLASS_ASSIGN_TEACHER", "CLASS_CANCEL",
                "CLASS_CLOSE_REQUEST", "STUDENT_VIEW", "STUDENT_CREATE", "STUDENT_EDIT", "STUDENT_DELETE")),
        new DefaultPosition("Giáo viên", "Giáo viên giảng dạy",
            "TEACHER", Set.of("CLASS_VIEW", "STUDENT_VIEW", "SCHEDULE_VIEW")),
        new DefaultPosition("Trưởng phòng ban", "Phê duyệt đóng lớp trong phòng ban",
            "GENERAL", Set.of("CLASS_VIEW", "CLASS_CLOSE_APPROVE", "CLASS_REOPEN")),
        // Must contain the teacher position's permissions so a MANAGER can assign it (MembershipPolicy).
        new DefaultPosition("Nhân sự phòng ban", "Quản lý nhân sự trong phòng ban",
            "GENERAL", Set.of(
                "PEOPLE_VIEW", "PEOPLE_EDIT", "CLASS_VIEW", "STUDENT_VIEW", "SCHEDULE_VIEW")),
        new DefaultPosition("Nhân viên cơ sở vật chất", "Quản lý cơ sở vật chất",
            "GENERAL", Set.of("FACILITY_MANAGE")),
        new DefaultPosition("Nhân viên", "Nhân viên chung", "GENERAL", Set.of())
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
            "INSERT INTO `position`(id, org_id, name, description, created_at, profile_type) VALUES (?,?,?,?,?,?)",
            id, orgId, definition.name(), definition.description(), Timestamp.from(Instant.now()),
            definition.profileType());
        new TreeSet<>(definition.permissions()).forEach(code -> jdbc.update(
            "INSERT INTO position_permission(position_id, permission_code) VALUES (?, ?)", id, code));
    }
}
