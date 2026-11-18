package com.mems.controller;

import com.mems.dto.ScheduleResponse;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import com.mems.service.ScheduleService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Set;

/**
 * Lịch của chính mình: giáo viên xem buổi mình dạy, học sinh xem buổi của lớp
 * mình. Không nhận tham số người dùng — chỉ dùng subject của JWT.
 */
@RestController
@RequestMapping("/schedules")
@PreAuthorize("isAuthenticated()")
public class ScheduleController {
    private static final Set<String> SELF_VIEW = Set.of("schedule.self_view", "schedule.view");

    private final ScheduleService schedules;
    private final Actor actor;
    private final OrganizationModuleGuard modules;

    public ScheduleController(ScheduleService schedules, Actor actor, OrganizationModuleGuard modules) {
        this.schedules = schedules;
        this.actor = actor;
        this.modules = modules;
    }

    @GetMapping("/me")
    public List<ScheduleResponse> mine(@RequestParam(required = false) Instant from,
                                       @RequestParam(required = false) Instant to) {
        String orgId = actor.orgId();
        modules.requireModuleReadable(orgId, "SCHEDULE_MANAGEMENT");
        actor.requireAnyPermission(SELF_VIEW);
        return schedules.mine(orgId, actor.userId(), actor.role(), from, to);
    }
}
