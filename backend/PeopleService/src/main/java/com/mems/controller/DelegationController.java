package com.mems.controller;

import com.mems.dto.DelegationCreateRequest;
import com.mems.dto.DelegationResponse;
import com.mems.dto.DelegationRevokeRequest;
import com.mems.dto.DelegationUpdateRequest;
import com.mems.service.DelegationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

/**
 * Ủy quyền quyền hạn từ Owner cho Tổng quản lý (quy tắc 3, 7).
 *
 * <p>Mọi thao tác quản trị chỉ Owner được gọi; {@code /delegations/me} cho phép
 * người nhận xem đúng những quyền đang được ủy quyền cho mình.</p>
 */
@RestController
@RequestMapping("/delegations")
public class DelegationController {
    private final DelegationService service;

    public DelegationController(DelegationService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasRole('OWNER')")
    public List<DelegationResponse> list(
            @RequestParam(name = "activeOnly", defaultValue = "false") boolean activeOnly) {
        return service.list(activeOnly);
    }

    @GetMapping("/me")
    public List<DelegationResponse> mine() {
        return service.mine();
    }

    @PostMapping
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<DelegationResponse> create(@Valid @RequestBody DelegationCreateRequest request) {
        DelegationResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/delegations/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('OWNER')")
    public DelegationResponse update(@PathVariable String id,
                                     @Valid @RequestBody DelegationUpdateRequest request) {
        return service.update(id, request);
    }

    @PostMapping("/{id}/revoke")
    @PreAuthorize("hasRole('OWNER')")
    public DelegationResponse revoke(@PathVariable String id,
                                     @Valid @RequestBody(required = false) DelegationRevokeRequest request) {
        return service.revoke(id, request);
    }
}
