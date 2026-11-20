package com.mems.service;

import java.util.List;
import java.util.Set;

/**
 * Danh mục quyền chuẩn của MEMS — mã dạng {@code <module>.<resource>.<action>}.
 *
 * <p>{@code moduleCode == null}: quyền nhân sự dùng chung, gán được cho chức danh
 * của bất kỳ phòng ban nào (kể cả bundle HR_MANAGEMENT — quy tắc 9). Các quyền
 * còn lại bị chặn theo module mà phòng ban phục vụ (quy tắc 10).</p>
 */
public final class PermissionCatalog {
    private PermissionCatalog() {}

    public static final String SCOPE_ORGANIZATION = "ORGANIZATION";
    public static final String SCOPE_DEPARTMENT = "DEPARTMENT";

    public record PermissionDefinition(String code, String description, String moduleCode,
                                       Set<String> allowedScopes) {
        public PermissionDefinition(String code, String description, String moduleCode) {
            this(code, description, moduleCode,
                Set.of(SCOPE_ORGANIZATION, SCOPE_DEPARTMENT));
        }
    }

    public record BundleDefinition(String code, String name, String description,
                                   Set<String> permissions, Set<String> allowedScopes) {}

    private static PermissionDefinition orgAndDept(String code, String description, String moduleCode) {
        return new PermissionDefinition(code, description, moduleCode,
            Set.of(SCOPE_ORGANIZATION, SCOPE_DEPARTMENT));
    }

    private static PermissionDefinition orgOnly(String code, String description, String moduleCode) {
        return new PermissionDefinition(code, description, moduleCode, Set.of(SCOPE_ORGANIZATION));
    }

    public static final List<PermissionDefinition> ENTRIES = List.of(
        // Quản lý nhân sự
        orgAndDept("employee.view", "View employees", null),
        orgAndDept("employee.create", "Create employees", null),
        orgAndDept("employee.edit", "Edit employee profiles", null),
        orgAndDept("employee.delete", "Remove employees", null),
        orgAndDept("employee.reset_password", "Reset employee passwords", null),
        orgAndDept("employee.assign_position", "Assign positions to employees", null),
        orgAndDept("employee.view_detail", "View sensitive employee details", null),
        orgAndDept("employee.resign", "Request employee resignation", null),
        orgAndDept("employee.approve_resignation", "Approve or reject resignation requests", null),
        orgAndDept("employee.transfer", "Initiate department transfer requests", null),
        orgAndDept("employee.approve_transfer", "Approve the HR step of department transfers", null),
        orgAndDept("teacher.change_status", "Change a teacher's teaching status", null),
        orgAndDept("position.view", "View positions", null),
        orgAndDept("position.manage", "Create, update and delete positions", null),
        orgAndDept("department.view", "View departments", null),
        orgOnly("department.manage", "Create, update and delete departments", null),
        // Quản lý đào tạo học sinh / lớp — tài nguyên cấp tổ chức.
        // `class.view` cho phép phạm vi DEPARTMENT để trưởng phòng/HR phòng xem được
        // lớp trong phòng; PeopleService lọc dữ liệu theo department của người tạo/lớp.
        orgOnly("student.view", "View students", "STUDENT_MANAGEMENT"),
        orgOnly("student.create", "Create students", "STUDENT_MANAGEMENT"),
        orgOnly("student.edit", "Edit students", "STUDENT_MANAGEMENT"),
        orgOnly("student.delete", "Delete students", "STUDENT_MANAGEMENT"),
        orgOnly("student.create_account", "Create login accounts for students", "STUDENT_MANAGEMENT"),
        orgAndDept("class.view", "View classes", "STUDENT_MANAGEMENT"),
        orgOnly("class.create", "Create classes", "STUDENT_MANAGEMENT"),
        orgOnly("class.edit", "Edit classes", "STUDENT_MANAGEMENT"),
        orgOnly("class.delete", "Delete classes", "STUDENT_MANAGEMENT"),
        orgOnly("class.assign_teacher", "Assign teachers to classes", "STUDENT_MANAGEMENT"),
        orgOnly("class.teacher.reassign", "Reassign a class to another teacher", "STUDENT_MANAGEMENT"),
        orgOnly("class.cancel", "Cancel classes", "STUDENT_MANAGEMENT"),
        orgOnly("class.request_close", "Request class closure", "STUDENT_MANAGEMENT"),
        orgOnly("class.approve_close", "Approve or reject class closure", "STUDENT_MANAGEMENT"),
        orgAndDept("class.reopen", "Reopen closed classes", "STUDENT_MANAGEMENT"),
        // Danh mục môn học — tài nguyên cấp tổ chức, dùng khi tạo/sửa lớp.
        orgOnly("subject.view", "View subjects", "STUDENT_MANAGEMENT"),
        orgOnly("subject.manage", "Create, update and activate/deactivate subjects", "STUDENT_MANAGEMENT"),
        // Quyền SELF (chỉ dữ liệu của chính người dùng) — không gắn module/phòng ban.
        // Cho phép cả DEPARTMENT vì giáo viên/trưởng phòng giữ chức vụ DEPARTMENT
        // vẫn cần xem lớp/lịch của chính mình.
        orgAndDept("student.self_view", "View own student profile", null),
        orgAndDept("class.self_view", "View own class", null),
        orgAndDept("schedule.self_view", "View own schedule", null),
        // Lịch học
        orgAndDept("schedule.view", "View department schedules", "SCHEDULE_MANAGEMENT"),
        orgAndDept("schedule.create", "Create department schedules", "SCHEDULE_MANAGEMENT"),
        // `schedule.edit` giữ lại cho dữ liệu cũ; `schedule.update` là mã chuẩn Phần 7.
        orgAndDept("schedule.edit", "Edit department schedules", "SCHEDULE_MANAGEMENT"),
        orgAndDept("schedule.update", "Update department schedules", "SCHEDULE_MANAGEMENT"),
        orgAndDept("schedule.cancel_session", "Cancel a schedule session", "SCHEDULE_MANAGEMENT"),
        orgAndDept("schedule.delete", "Delete department schedules", "SCHEDULE_MANAGEMENT"),
        // Cơ sở vật chất
        orgAndDept("facility.view", "View department facilities", "FACILITY_MANAGEMENT"),
        orgAndDept("facility.manage", "Manage department facilities", "FACILITY_MANAGEMENT"),
        orgAndDept("facility.room.view", "View rooms", "FACILITY_MANAGEMENT"),
        orgAndDept("facility.room.create", "Create rooms", "FACILITY_MANAGEMENT"),
        orgAndDept("facility.room.update", "Update rooms", "FACILITY_MANAGEMENT"),
        orgAndDept("facility.room.delete", "Delete rooms", "FACILITY_MANAGEMENT"),
        orgAndDept("facility.equipment.view", "View equipment", "FACILITY_MANAGEMENT"),
        orgAndDept("facility.equipment.create", "Create equipment", "FACILITY_MANAGEMENT"),
        orgAndDept("facility.equipment.update", "Update equipment", "FACILITY_MANAGEMENT"),
        orgAndDept("facility.equipment.delete", "Delete equipment", "FACILITY_MANAGEMENT"),
        orgAndDept("facility.issue.report", "Report facility issues", "FACILITY_MANAGEMENT"),
        orgAndDept("facility.issue.resolve", "Resolve facility issues", "FACILITY_MANAGEMENT"),
        // Nhật ký tổ chức — xem thao tác trong toàn tổ chức (CC-06).
        orgOnly("org.audit.view", "View organization audit logs", null)
    );

    public static final List<BundleDefinition> BUNDLES = List.of(
        new BundleDefinition("HR_MANAGEMENT", "Quản lý nhân sự",
            "Quản lý nhân sự phạm vi tổ chức hoặc phòng ban",
            Set.of("employee.view", "employee.create", "employee.edit", "employee.delete",
                "employee.reset_password", "employee.assign_position", "employee.view_detail",
                "employee.resign", "employee.approve_resignation", "employee.transfer",
                "employee.approve_transfer", "teacher.change_status",
                "position.view", "position.manage", "department.view"),
            Set.of(SCOPE_ORGANIZATION, SCOPE_DEPARTMENT)),
        new BundleDefinition("ACADEMIC_MANAGEMENT", "Quản lý đào tạo học sinh",
            "Quản lý học sinh và lớp học",
            Set.of("student.view", "student.create", "student.edit", "student.delete",
                "student.create_account", "class.view", "class.create", "class.edit",
                "class.delete", "class.assign_teacher", "class.teacher.reassign",
                "class.cancel", "class.request_close", "class.reopen",
                "subject.view", "subject.manage"),
            Set.of(SCOPE_ORGANIZATION)),
        new BundleDefinition("SCHEDULE_MANAGEMENT", "Quản lý lịch học",
            "Quản lý lịch học của phòng ban",
            Set.of("schedule.view", "schedule.create", "schedule.edit", "schedule.update",
                "schedule.cancel_session", "schedule.delete"),
            Set.of(SCOPE_ORGANIZATION, SCOPE_DEPARTMENT)),
        new BundleDefinition("FACILITY_MANAGEMENT", "Quản lý cơ sở vật chất",
            "Quản lý phòng học và thiết bị",
            Set.of("facility.view", "facility.manage",
                "facility.room.view", "facility.room.create", "facility.room.update",
                "facility.room.delete", "facility.equipment.view", "facility.equipment.create",
                "facility.equipment.update", "facility.equipment.delete",
                "facility.issue.report", "facility.issue.resolve"),
            Set.of(SCOPE_ORGANIZATION, SCOPE_DEPARTMENT))
    );
}
