package com.mems.controller;

import com.mems.dto.RoomSuggestionResponse;
import com.mems.dto.ScheduleRequest;
import com.mems.dto.ScheduleResponse;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import com.mems.service.ScheduleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Set;

/**
 * Lịch học theo phòng ban. Mỗi endpoint kiểm quyền theo mã + phạm vi phòng ban,
 * module SCHEDULE_MANAGEMENT đang bật và luôn lọc `org_id` từ JWT.
 */
@RestController
@RequestMapping("/departments/{departmentId}/schedules")
@PreAuthorize("isAuthenticated()")
public class DepartmentScheduleController {
    private static final String MODULE = "SCHEDULE_MANAGEMENT";
    private static final Set<String> VIEW = Set.of("schedule.view");
    private static final Set<String> CREATE = Set.of("schedule.create");
    private static final Set<String> UPDATE = Set.of("schedule.update", "schedule.edit");
    private static final Set<String> CANCEL = Set.of("schedule.cancel_session", "schedule.update", "schedule.edit");
    private static final Set<String> DELETE = Set.of("schedule.delete");

    private final ScheduleService schedules;
    private final Actor actor;
    private final OrganizationModuleGuard modules;

    public DepartmentScheduleController(ScheduleService schedules, Actor actor,
                                        OrganizationModuleGuard modules) {
        this.schedules = schedules;
        this.actor = actor;
        this.modules = modules;
    }

    @GetMapping
    public List<ScheduleResponse> list(@PathVariable String departmentId,
                                       @RequestParam(required = false) Instant from,
                                       @RequestParam(required = false) Instant to,
                                       @RequestParam(required = false) String classId) {
        authorizeRead(VIEW, departmentId);
        return schedules.list(actor.orgId(), departmentId, from, to, classId);
    }

    @PostMapping
    public ResponseEntity<ScheduleResponse> create(@PathVariable String departmentId,
                                                    @Valid @RequestBody ScheduleRequest request) {
        authorize(CREATE, departmentId);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(schedules.create(actor.orgId(), departmentId, request));
    }

    @PutMapping("/{sessionId}")
    public ScheduleResponse update(@PathVariable String departmentId, @PathVariable String sessionId,
                                   @Valid @RequestBody ScheduleRequest request) {
        authorize(UPDATE, departmentId);
        return schedules.update(actor.orgId(), departmentId, sessionId, request);
    }

    @PostMapping("/{sessionId}/cancel")
    public ScheduleResponse cancel(@PathVariable String departmentId, @PathVariable String sessionId) {
        authorize(CANCEL, departmentId);
        return schedules.cancel(actor.orgId(), departmentId, sessionId);
    }

    @DeleteMapping("/{sessionId}")
    public ResponseEntity<Void> delete(@PathVariable String departmentId, @PathVariable String sessionId) {
        authorize(DELETE, departmentId);
        schedules.delete(actor.orgId(), departmentId, sessionId);
        return ResponseEntity.noContent().build();
    }

    /** Gợi ý phòng còn trống; loại phòng bảo trì/đóng và phòng có thiết bị hỏng. */
    @GetMapping("/room-suggestions")
    public List<RoomSuggestionResponse> roomSuggestions(@PathVariable String departmentId,
                                                         @RequestParam(required = false) Instant startTime,
                                                         @RequestParam(required = false) Instant endTime) {
        authorize(CREATE, departmentId);
        return schedules.roomSuggestions(actor.orgId(), departmentId, startTime, endTime);
    }

    private void authorize(Set<String> codes, String departmentId) {
        modules.requireModuleForWrite(actor.orgId(), MODULE);
        actor.requireAnyPermissionIn(codes, departmentId);
    }

    private void authorizeRead(Set<String> codes, String departmentId) {
        modules.requireModuleReadable(actor.orgId(), MODULE);
        actor.requireAnyPermissionIn(codes, departmentId);
    }
}
