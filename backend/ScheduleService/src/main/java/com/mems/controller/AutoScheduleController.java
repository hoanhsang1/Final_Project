package com.mems.controller;

import com.mems.dto.AutoScheduleRequest;
import com.mems.dto.AutoScheduleResult;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import com.mems.service.AutoScheduleService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

/** Xếp lịch tự động: POST /departments/{departmentId}/schedules/auto-generate?dryRun=... */
@RestController
@RequestMapping("/departments/{departmentId}/schedules")
@PreAuthorize("isAuthenticated()")
public class AutoScheduleController {
    private static final String MODULE = "SCHEDULE_MANAGEMENT";
    private static final Set<String> CREATE_ALIASES = Set.of("schedule.create", "SCHEDULE_CREATE");

    private final AutoScheduleService autoScheduleService;
    private final Actor actor;
    private final OrganizationModuleGuard modules;

    public AutoScheduleController(AutoScheduleService autoScheduleService, Actor actor,
                                  OrganizationModuleGuard modules) {
        this.autoScheduleService = autoScheduleService;
        this.actor = actor;
        this.modules = modules;
    }

    /** dryRun mặc định true: chỉ trả bản nháp, không ghi DB. */
    @PostMapping("/auto-generate")
    public AutoScheduleResult autoGenerate(@PathVariable String departmentId,
                                           @Valid @RequestBody AutoScheduleRequest request,
                                           @RequestParam(defaultValue = "true") boolean dryRun) {
        modules.requireModuleForWrite(actor.orgId(), MODULE);
        actor.requireAnyPermissionIn(CREATE_ALIASES, departmentId);
        return autoScheduleService.generate(actor.orgId(), departmentId, request, dryRun);
    }
}
