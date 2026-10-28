package com.mems.service;

import java.util.List;

public final class PermissionCatalog {
    private PermissionCatalog() {}
    public record PermissionDefinition(String code, String description) {}
    public static final List<PermissionDefinition> ENTRIES = List.of(
        new PermissionDefinition("FACILITY_MANAGE", "Manage department facilities"),
        new PermissionDefinition("SCHEDULE_CREATE", "Create department schedules"),
        new PermissionDefinition("SCHEDULE_VIEW", "View department schedules"),
        new PermissionDefinition("PEOPLE_VIEW", "View department members"),
        new PermissionDefinition("PEOPLE_EDIT", "Manage department members")
    );
}
