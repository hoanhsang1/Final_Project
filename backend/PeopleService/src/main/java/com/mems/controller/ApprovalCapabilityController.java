package com.mems.controller;

import com.mems.dto.ApprovalCapabilitiesResponse;
import com.mems.dto.ApprovalInboxResponse;
import com.mems.security.Actor;
import com.mems.service.ClassApprovalPolicy;
import com.mems.service.ClassStatusService;
import com.mems.service.ResignationApprovalPolicy;
import com.mems.service.ResignationService;
import com.mems.service.TransferService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Khả năng duyệt và hộp duyệt hợp nhất của chính người dùng. Các policy quyết
 * định (trưởng phòng, HR, Tổng quản lý có ủy quyền, OWNER) nên FE không được
 * suy ra từ mã quyền hay role MANAGER.
 */
@RestController
public class ApprovalCapabilityController {
    private final Actor actor;
    private final TransferService transfers;
    private final ResignationService resignations;
    private final ResignationApprovalPolicy resignationPolicy;
    private final ClassApprovalPolicy classes;
    private final ClassStatusService classStatus;

    public ApprovalCapabilityController(Actor actor, TransferService transfers,
                                        ResignationService resignations,
                                        ResignationApprovalPolicy resignationPolicy,
                                        ClassApprovalPolicy classes,
                                        ClassStatusService classStatus) {
        this.actor = actor;
        this.transfers = transfers;
        this.resignations = resignations;
        this.resignationPolicy = resignationPolicy;
        this.classes = classes;
        this.classStatus = classStatus;
    }

    @GetMapping("/users/me/approval-capabilities")
    @Transactional(readOnly = true)
    public ApprovalCapabilitiesResponse mine() {
        String orgId = actor.orgId();
        boolean transfer = transfers.canDecideAny();
        boolean resignation = resignationPolicy.canApproveAny(orgId);
        boolean classLifecycle = classes.canApprove(orgId);
        return new ApprovalCapabilitiesResponse(transfer, resignation, classLifecycle,
            transfer || resignation || classLifecycle);
    }

    /**
     * Gộp ba loại việc chờ duyệt (điều chuyển, nghỉ việc, vòng đời lớp) để FE
     * không phải gọi danh sách phòng ban/nhân sự như điều kiện tiên quyết.
     * Mặc định chỉ trả yêu cầu nghỉ việc đang PENDING; truyền
     * {@code resignationStatus} để xem trạng thái khác.
     */
    @GetMapping("/users/me/approval-inbox")
    @Transactional(readOnly = true)
    public ApprovalInboxResponse inbox(
        @RequestParam(name = "resignationStatus", required = false) String resignationStatus) {
        var transferItems = transfers.inbox();
        var resignationItems = resignations.inbox(resignationStatus);
        var classItems = classStatus.approvalInbox();
        return new ApprovalInboxResponse(transferItems, resignationItems, classItems,
            transferItems.size() + resignationItems.size() + classItems.size());
    }
}
