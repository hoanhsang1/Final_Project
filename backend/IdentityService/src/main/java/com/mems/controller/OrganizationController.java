
package com.mems.controller;

import com.mems.service.OrganizationApprovalService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/organizations")
public class OrganizationController {

    private final OrganizationApprovalService approvalService;

    public OrganizationController(
            OrganizationApprovalService approvalService
    ) {
        this.approvalService = approvalService;
    }

    @GetMapping("/pending")
    public ResponseEntity<List<Map<String, Object>>> getPending() {
        return ResponseEntity.ok(
                approvalService.getPending()
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getDetail(
            @PathVariable String id
    ) {
        return ResponseEntity.ok(
                approvalService.getDetail(id)
        );
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<Void> approve(
            @PathVariable String id
    ) {
        approvalService.approve(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<Void> reject(
            @PathVariable String id
    ) {
        approvalService.reject(id);
        return ResponseEntity.noContent().build();
    }
}
