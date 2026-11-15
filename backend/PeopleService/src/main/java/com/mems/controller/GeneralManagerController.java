package com.mems.controller;

import com.mems.dto.GeneralManagerAppointRequest;
import com.mems.dto.GeneralManagerCandidateResponse;
import com.mems.dto.GeneralManagerResponse;
import com.mems.service.GeneralManagerService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

/**
 * Bổ nhiệm / bãi nhiệm Tổng quản lý — chức danh cấp tổ chức, chỉ Owner gán
 * (quy tắc 3, 18). Chức danh không kèm quyền; quyền đến từ ủy quyền.
 */
@RestController
@RequestMapping("/general-manager")
public class GeneralManagerController {
    private final GeneralManagerService service;

    public GeneralManagerController(GeneralManagerService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasRole('OWNER')")
    public List<GeneralManagerResponse> list() {
        return service.list();
    }

    @GetMapping("/candidates")
    @PreAuthorize("hasRole('OWNER')")
    public List<GeneralManagerCandidateResponse> candidates() {
        return service.candidates();
    }

    @PostMapping
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<GeneralManagerResponse> appoint(
            @Valid @RequestBody GeneralManagerAppointRequest request) {
        GeneralManagerResponse appointed = service.appoint(request);
        return ResponseEntity.created(URI.create("/general-manager/" + appointed.userId()))
            .body(appointed);
    }

    @DeleteMapping("/{userId}")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Void> remove(@PathVariable String userId,
                                       @RequestParam(name = "reason", required = false) String reason) {
        service.remove(userId, reason);
        return ResponseEntity.noContent().build();
    }
}
