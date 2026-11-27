package com.mems.controller;

import com.mems.dto.ClassSlotRulesRequest;
import com.mems.dto.ClassSlotRulesResponse;
import com.mems.dto.TeacherAvailabilityRequest;
import com.mems.dto.TeacherAvailabilityResponse;
import com.mems.dto.TimeSlotConfigRequest;
import com.mems.dto.TimeSlotConfigResponse;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import com.mems.service.ScheduleConfigService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Cấu hình lịch cấp tổ chức: tiết học, quy tắc lớp, lịch rảnh giáo viên.
 * Mọi endpoint kiểm module SCHEDULE_MANAGEMENT và quyền schedule.config trong org.
 */
@RestController
@RequestMapping("/schedule-config")
@PreAuthorize("isAuthenticated()")
public class ScheduleConfigController {
    private static final String MODULE = "SCHEDULE_MANAGEMENT";
    private static final String PERMISSION = "schedule.config";

    private final ScheduleConfigService config;
    private final Actor actor;
    private final OrganizationModuleGuard modules;

    public ScheduleConfigController(ScheduleConfigService config, Actor actor,
                                    OrganizationModuleGuard modules) {
        this.config = config;
        this.actor = actor;
        this.modules = modules;
    }

    @GetMapping("/time-slots")
    public TimeSlotConfigResponse timeSlots() {
        authorizeRead();
        return config.listTimeSlots(actor.orgId());
    }

    @PutMapping("/time-slots")
    public TimeSlotConfigResponse replaceTimeSlots(@Valid @RequestBody TimeSlotConfigRequest request) {
        authorizeWrite();
        return config.replaceTimeSlots(actor.orgId(), request);
    }

    @GetMapping("/classes/{classId}/slot-rules")
    public ClassSlotRulesResponse classRules(@PathVariable String classId) {
        authorizeRead();
        return config.getClassRules(actor.orgId(), classId);
    }

    @PutMapping("/classes/{classId}/slot-rules")
    public ClassSlotRulesResponse replaceClassRules(@PathVariable String classId,
                                                    @Valid @RequestBody ClassSlotRulesRequest request) {
        authorizeWrite();
        return config.replaceClassRules(actor.orgId(), classId, request);
    }

    @GetMapping("/teachers/{teacherId}/availability")
    public TeacherAvailabilityResponse teacherAvailability(@PathVariable String teacherId) {
        authorizeRead();
        return config.getTeacherAvailability(actor.orgId(), teacherId);
    }

    @PutMapping("/teachers/{teacherId}/availability")
    public TeacherAvailabilityResponse replaceTeacherAvailability(
        @PathVariable String teacherId, @Valid @RequestBody TeacherAvailabilityRequest request) {
        authorizeWrite();
        return config.replaceTeacherAvailability(actor.orgId(), teacherId, request);
    }

    private void authorizeRead() {
        modules.requireModuleReadable(actor.orgId(), MODULE);
        actor.requirePermissionIn(PERMISSION, null);
    }

    private void authorizeWrite() {
        modules.requireModuleForWrite(actor.orgId(), MODULE);
        actor.requirePermissionIn(PERMISSION, null);
    }
}
