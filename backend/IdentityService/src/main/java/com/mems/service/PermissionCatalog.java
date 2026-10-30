package com.mems.service;

import java.util.List;

public final class PermissionCatalog {
    private PermissionCatalog() {}
    public record PermissionDefinition(String code, String description, String moduleCode) {}
    public static final List<PermissionDefinition> ENTRIES = List.of(
        new PermissionDefinition("FACILITY_MANAGE", "Manage department facilities", null),
        new PermissionDefinition("SCHEDULE_CREATE", "Create department schedules", null),
        new PermissionDefinition("SCHEDULE_VIEW", "View department schedules", null),
        new PermissionDefinition("PEOPLE_VIEW", "View department members", null),
        new PermissionDefinition("PEOPLE_EDIT", "Manage department members", null),
        new PermissionDefinition("STUDENT_VIEW", "View students", "STUDENT_MANAGEMENT"),
        new PermissionDefinition("STUDENT_CREATE", "Create students", "STUDENT_MANAGEMENT"),
        new PermissionDefinition("STUDENT_EDIT", "Edit students", "STUDENT_MANAGEMENT"),
        new PermissionDefinition("STUDENT_DELETE", "Delete students", "STUDENT_MANAGEMENT"),
        new PermissionDefinition("CLASS_VIEW", "View classes", "STUDENT_MANAGEMENT"),
        new PermissionDefinition("CLASS_CREATE", "Create classes", "STUDENT_MANAGEMENT"),
        new PermissionDefinition("CLASS_EDIT", "Edit classes", "STUDENT_MANAGEMENT"),
        new PermissionDefinition("CLASS_DELETE", "Delete classes", "STUDENT_MANAGEMENT")
    );
}
