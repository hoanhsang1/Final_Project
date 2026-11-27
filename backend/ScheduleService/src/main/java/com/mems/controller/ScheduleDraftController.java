package com.mems.controller;

import com.mems.dto.ScheduleDraftConfirmResponse;
import com.mems.dto.ScheduleDraftDetailResponse;
import com.mems.dto.ScheduleDraftItemResponse;
import com.mems.dto.ScheduleDraftPatchRequest;
import com.mems.dto.ScheduleDraftRequest;
import com.mems.dto.ScheduleDraftSummaryResponse;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import com.mems.service.ScheduleDraftService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Set;

/**
 * Lịch nháp theo phòng ban: tạo nháp, xem lưới tuần, sửa tay, xác nhận/huỷ.
 * Không endpoint nào ghi `session` ngoại trừ bước xác nhận.
 */
@RestController
@RequestMapping("/departments/{departmentId}/schedules/drafts")
@PreAuthorize("isAuthenticated()")
public class ScheduleDraftController {
    private static final String MODULE = "SCHEDULE_MANAGEMENT";
    private static final Set<String> VIEW = Set.of("schedule.view");
    private static final Set<String> WRITE = Set.of("schedule.create");

    private final ScheduleDraftService drafts;
    private final Actor actor;
    private final OrganizationModuleGuard modules;

    public ScheduleDraftController(ScheduleDraftService drafts, Actor actor,
                                   OrganizationModuleGuard modules) {
        this.drafts = drafts;
        this.actor = actor;
        this.modules = modules;
    }

    @PostMapping
    public ResponseEntity<ScheduleDraftDetailResponse> create(@PathVariable String departmentId,
                                                              @Valid @RequestBody ScheduleDraftRequest request) {
        authorizeWrite(departmentId);
        ScheduleDraftDetailResponse detail = drafts.create(actor.orgId(), departmentId,
            actor.userId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(detail);
    }

    @GetMapping
    public List<ScheduleDraftSummaryResponse> list(@PathVariable String departmentId,
                                                   @RequestParam(required = false) String status) {
        authorizeRead(departmentId);
        return drafts.list(actor.orgId(), departmentId, status);
    }

    @GetMapping("/{draftId}")
    public ScheduleDraftDetailResponse detail(@PathVariable String departmentId,
                                              @PathVariable String draftId,
                                              @RequestParam(defaultValue = "1") int week) {
        authorizeRead(departmentId);
        return drafts.detail(actor.orgId(), departmentId, draftId, week);
    }

    @PatchMapping("/{draftId}/items/{itemId}")
    public ScheduleDraftItemResponse patchItem(@PathVariable String departmentId,
                                               @PathVariable String draftId,
                                               @PathVariable String itemId,
                                               @RequestBody ScheduleDraftPatchRequest request) {
        authorizeWrite(departmentId);
        return drafts.patchItem(actor.orgId(), departmentId, draftId, itemId, request);
    }

    /** 200 khi tạo đủ; 409 kèm danh sách buổi lỗi và transaction đã rollback. */
    @PostMapping("/{draftId}/confirm")
    public ResponseEntity<ScheduleDraftConfirmResponse> confirm(@PathVariable String departmentId,
                                                                @PathVariable String draftId) {
        authorizeWrite(departmentId);
        ScheduleDraftConfirmResponse result = drafts.confirm(actor.orgId(), departmentId, draftId);
        return result.created() == 0 && !result.failed().isEmpty()
            ? ResponseEntity.status(HttpStatus.CONFLICT).body(result)
            : ResponseEntity.ok(result);
    }

    @DeleteMapping("/{draftId}")
    public ResponseEntity<Void> discard(@PathVariable String departmentId,
                                        @PathVariable String draftId) {
        authorizeWrite(departmentId);
        drafts.discard(actor.orgId(), departmentId, draftId);
        return ResponseEntity.noContent().build();
    }

    private void authorize(Set<String> codes, String departmentId) {
        modules.requireModuleForWrite(actor.orgId(), MODULE);
        actor.requireAnyPermissionIn(codes, departmentId);
    }

    private void authorizeRead(String departmentId) {
        modules.requireModuleReadable(actor.orgId(), MODULE);
        actor.requireAnyPermissionIn(VIEW, departmentId);
    }

    private void authorizeWrite(String departmentId) {
        authorize(WRITE, departmentId);
    }
}
