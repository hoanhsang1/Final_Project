package com.mems.controller;

import com.mems.service.OrganizationApprovalService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
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

    @GetMapping
    public ResponseEntity<Map<String, Object>> getOrganizations(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String orgType,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String sort
    ) {
        return ResponseEntity.ok(
                approvalService.getOrganizations(page, size, status, orgType, keyword, sort)
        );
    }

    @GetMapping("/options")
    public ResponseEntity<List<Map<String, Object>>> getOptions() {
        return ResponseEntity.ok(
                approvalService.getOptions()
        );
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
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        approvalService.approve(id, jwt.getSubject());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<Void> reject(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody(required = false) Map<String, Object> body
    ) {
        String reason = body != null && body.get("reason") != null ? body.get("reason").toString() : null;
        approvalService.reject(id, jwt.getSubject(), reason);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/suspend")
    public ResponseEntity<Void> suspend(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody(required = false) Map<String, Object> body
    ) {
        String reason = body != null && body.get("reason") != null ? body.get("reason").toString() : null;
        approvalService.suspend(id, jwt.getSubject(), reason);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/reactivate")
    public ResponseEntity<Void> reactivate(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody(required = false) Map<String, Object> body
    ) {
        String reason = body != null && body.get("reason") != null ? body.get("reason").toString() : null;
        approvalService.reactivate(id, jwt.getSubject(), reason);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/modules")
    public ResponseEntity<Void> updateModules(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody Map<String, Object> body
    ) {
        @SuppressWarnings("unchecked")
        List<String> modules = (List<String>) body.get("modules");
        approvalService.updateModules(id, jwt.getSubject(), modules);
        return ResponseEntity.noContent().build();
    }
}
