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

/**
 * Xếp lịch tự động cho nhiều lớp cùng lúc theo khung giờ và khoảng ngày.
 * Route: POST /departments/{departmentId}/schedules/auto-generate
 * Yêu cầu quyền schedule.create trong phòng ban và module SCHEDULE_MANAGEMENT.
 */
@RestController
@RequestMapping("/departments/{departmentId}/schedules")
@PreAuthorize("isAuthenticated()")
public class AutoScheduleController {

    private static final String MODULE = "SCHEDULE_MANAGEMENT";
    private static final Set<String> CREATE = Set.of("schedule.create");

    private final AutoScheduleService autoScheduleService;
    private final Actor actor;
    private final OrganizationModuleGuard modules;

    public AutoScheduleController(AutoScheduleService autoScheduleService,
                                  Actor actor,
                                  OrganizationModuleGuard modules) {
        this.autoScheduleService = autoScheduleService;
        this.actor = actor;
        this.modules = modules;
    }

    /**
     * Chạy thuật toán greedy xếp lịch tự động.
     * Trả về danh sách buổi đã xếp + danh sách buổi không xếp được với lý do cụ thể.
     * Mỗi buổi thành công được persist ngay vào DB (gọi ScheduleService.create()).
     *
     * @deprecated ghi thẳng buổi học, không có bước lịch nháp/chỉnh tay/xác nhận.
     *     Giữ tạm để không phá client cũ; dùng `/schedules/drafts` cho luồng mới.
     */
    @Deprecated
    @PostMapping("/auto-generate")
    public AutoScheduleResult autoGenerate(@PathVariable String departmentId,
                                           @Valid @RequestBody AutoScheduleRequest request) {
        modules.requireModuleForWrite(actor.orgId(), MODULE);
        actor.requireAnyPermissionIn(CREATE, departmentId);
        return autoScheduleService.generate(actor.orgId(), departmentId, request);
    }
}
