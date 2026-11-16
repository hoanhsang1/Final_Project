package com.mems.controller;

import com.mems.dto.ApprovalCapabilitiesResponse;
import com.mems.security.Actor;
import com.mems.service.ClassApprovalPolicy;
import com.mems.service.ResignationApprovalPolicy;
import com.mems.service.TransferService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Khả năng duyệt của chính người dùng. Các policy quyết định (trưởng phòng,
 * HR, Tổng quản lý có ủy quyền, OWNER) nên FE không được suy ra từ mã quyền
 * hay role MANAGER.
 */
@RestController
public class ApprovalCapabilityController {
    private final Actor actor;
    private final TransferService transfers;
    private final ResignationApprovalPolicy resignations;
    private final ClassApprovalPolicy classes;

    public ApprovalCapabilityController(Actor actor, TransferService transfers,
                                        ResignationApprovalPolicy resignations,
                                        ClassApprovalPolicy classes) {
        this.actor = actor;
        this.transfers = transfers;
        this.resignations = resignations;
        this.classes = classes;
    }

    @GetMapping("/users/me/approval-capabilities")
    @Transactional(readOnly = true)
    public ApprovalCapabilitiesResponse mine() {
        String orgId = actor.orgId();
        boolean transfer = transfers.canDecideAny();
        boolean resignation = resignations.canApproveAny(orgId);
        boolean classLifecycle = classes.canApprove(orgId);
        return new ApprovalCapabilitiesResponse(transfer, resignation, classLifecycle,
            transfer || resignation || classLifecycle);
    }
}
