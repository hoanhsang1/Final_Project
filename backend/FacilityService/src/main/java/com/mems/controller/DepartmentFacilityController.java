package com.mems.controller;

import com.mems.dto.*;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import com.mems.service.FacilityService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

/**
 * Cơ sở vật chất theo phòng ban. Mỗi endpoint kiểm cả quyền (mã + phạm vi) lẫn
 * module FACILITY_MANAGEMENT đang bật; `org_id` luôn lấy từ JWT.
 */
@RestController
@RequestMapping("/departments/{departmentId}/facilities")
@PreAuthorize("isAuthenticated()")
public class DepartmentFacilityController {
    private static final String MODULE = "FACILITY_MANAGEMENT";
    private static final Set<String> ROOM_VIEW = Set.of("facility.room.view", "facility.view");
    private static final Set<String> ROOM_CREATE = Set.of("facility.room.create", "facility.manage");
    private static final Set<String> ROOM_UPDATE = Set.of("facility.room.update", "facility.manage");
    private static final Set<String> ROOM_DELETE = Set.of("facility.room.delete", "facility.manage");
    private static final Set<String> EQUIPMENT_VIEW = Set.of("facility.equipment.view", "facility.view", "facility.manage");
    private static final Set<String> EQUIPMENT_CREATE = Set.of("facility.equipment.create", "facility.manage");
    private static final Set<String> EQUIPMENT_UPDATE = Set.of("facility.equipment.update", "facility.manage");
    private static final Set<String> EQUIPMENT_DELETE = Set.of("facility.equipment.delete", "facility.manage");
    private static final Set<String> ISSUE_VIEW =
        Set.of("facility.issue.resolve", "facility.issue.report", "facility.equipment.view", "facility.manage");
    private static final Set<String> ISSUE_REPORT = Set.of("facility.issue.report", "facility.manage");
    private static final Set<String> ISSUE_RESOLVE = Set.of("facility.issue.resolve", "facility.manage");

    private final FacilityService facilities;
    private final Actor actor;
    private final OrganizationModuleGuard modules;

    public DepartmentFacilityController(FacilityService facilities, Actor actor,
                                       OrganizationModuleGuard modules) {
        this.facilities = facilities;
        this.actor = actor;
        this.modules = modules;
    }

    @GetMapping
    public List<FacilityResponse> legacyList(@PathVariable String departmentId) {
        authorizeRead(ROOM_VIEW, departmentId);
        return facilities.listRooms(actor.orgId(), departmentId).stream()
            .map(room -> new FacilityResponse(room.id(), room.code(), room.name(), room.capacity(), room.status()))
            .toList();
    }

    // ------------------------------------------------------------------ rooms

    @GetMapping("/rooms")
    public List<RoomResponse> rooms(@PathVariable String departmentId) {
        authorizeRead(ROOM_VIEW, departmentId);
        return facilities.listRooms(actor.orgId(), departmentId);
    }

    @PostMapping("/rooms")
    public ResponseEntity<RoomResponse> createRoom(@PathVariable String departmentId,
                                                   @Valid @RequestBody RoomRequest request) {
        authorize(ROOM_CREATE, departmentId);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(facilities.createRoom(actor.orgId(), departmentId, request));
    }

    @PutMapping("/rooms/{roomId}")
    public RoomResponse updateRoom(@PathVariable String departmentId, @PathVariable String roomId,
                                   @Valid @RequestBody RoomRequest request) {
        authorize(ROOM_UPDATE, departmentId);
        return facilities.updateRoom(actor.orgId(), departmentId, roomId, request);
    }

    @DeleteMapping("/rooms/{roomId}")
    public ResponseEntity<Void> deleteRoom(@PathVariable String departmentId,
                                           @PathVariable String roomId) {
        authorize(ROOM_DELETE, departmentId);
        facilities.deleteRoom(actor.orgId(), departmentId, roomId);
        return ResponseEntity.noContent().build();
    }

    // -------------------------------------------------------------- equipment

    @GetMapping("/equipment")
    public List<EquipmentResponse> equipment(@PathVariable String departmentId) {
        authorizeRead(EQUIPMENT_VIEW, departmentId);
        return facilities.listEquipment(actor.orgId(), departmentId);
    }

    @PostMapping("/equipment")
    public ResponseEntity<EquipmentResponse> createEquipment(@PathVariable String departmentId,
                                                             @Valid @RequestBody EquipmentRequest request) {
        authorize(EQUIPMENT_CREATE, departmentId);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(facilities.createEquipment(actor.orgId(), departmentId, request));
    }

    @PutMapping("/equipment/{equipmentId}")
    public EquipmentResponse updateEquipment(@PathVariable String departmentId,
                                             @PathVariable String equipmentId,
                                             @Valid @RequestBody EquipmentRequest request) {
        authorize(EQUIPMENT_UPDATE, departmentId);
        return facilities.updateEquipment(actor.orgId(), departmentId, equipmentId, request, actor.userId());
    }

    @DeleteMapping("/equipment/{equipmentId}")
    public ResponseEntity<Void> deleteEquipment(@PathVariable String departmentId,
                                                @PathVariable String equipmentId) {
        authorize(EQUIPMENT_DELETE, departmentId);
        facilities.deleteEquipment(actor.orgId(), departmentId, equipmentId);
        return ResponseEntity.noContent().build();
    }

    // ----------------------------------------------------------------- issues

    @GetMapping("/issues")
    public List<IssueResponse> issues(@PathVariable String departmentId,
                                      @RequestParam(required = false) String status) {
        authorizeRead(ISSUE_VIEW, departmentId);
        return facilities.listIssues(actor.orgId(), departmentId, status);
    }

    @PostMapping("/issues")
    public ResponseEntity<IssueResponse> reportIssue(@PathVariable String departmentId,
                                                     @Valid @RequestBody IssueReportRequest request) {
        authorize(ISSUE_REPORT, departmentId);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(facilities.reportIssue(actor.orgId(), departmentId, actor.userId(), request));
    }

    @PostMapping("/issues/{issueId}/resolve")
    public IssueResponse resolveIssue(@PathVariable String departmentId, @PathVariable String issueId) {
        authorize(ISSUE_RESOLVE, departmentId);
        return facilities.resolveIssue(actor.orgId(), departmentId, actor.userId(), issueId);
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
