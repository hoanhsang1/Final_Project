package com.mems.controller;

import com.mems.dto.ResignationCreateRequest;
import com.mems.dto.ResignationDecisionRequest;
import com.mems.dto.ResignationResponse;
import com.mems.security.RequirePermission;
import com.mems.service.ResignationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

/**
 * Hộp thư nghỉ việc theo phòng ban — duyệt một bước bởi HR (quy tắc 16).
 * Nằm dưới /departments/** để dùng đúng route sẵn có của API Gateway.
 */
@RestController
@RequestMapping("/departments/{departmentId}/resignation-requests")
public class ResignationController {
    private final ResignationService service;

    public ResignationController(ResignationService service) {
        this.service = service;
    }

    @GetMapping
    @RequirePermission(value = "employee.view", department = "departmentId")
    public List<ResignationResponse> list(@PathVariable String departmentId,
                                          @RequestParam(required = false) String status) {
        return service.list(departmentId, status);
    }

    @PostMapping
    @RequirePermission(value = "employee.resign", department = "departmentId")
    public ResponseEntity<ResignationResponse> create(@PathVariable String departmentId,
                                                      @Valid @RequestBody ResignationCreateRequest request) {
        var created = service.create(departmentId, request);
        return ResponseEntity.created(URI.create("/departments/" + departmentId
            + "/resignation-requests/" + created.id())).body(created);
    }

    @PostMapping("/{requestId}/approve")
    @RequirePermission(value = "employee.approve_resignation", department = "departmentId")
    public ResignationResponse approve(@PathVariable String departmentId, @PathVariable String requestId,
                                       @Valid @RequestBody(required = false) ResignationDecisionRequest request) {
        return service.approve(departmentId, requestId,
            request == null ? new ResignationDecisionRequest(null) : request);
    }

    @PostMapping("/{requestId}/reject")
    @RequirePermission(value = "employee.approve_resignation", department = "departmentId")
    public ResignationResponse reject(@PathVariable String departmentId, @PathVariable String requestId,
                                      @Valid @RequestBody(required = false) ResignationDecisionRequest request) {
        return service.reject(departmentId, requestId,
            request == null ? new ResignationDecisionRequest(null) : request);
    }
}
