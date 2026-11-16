package com.mems.controller;

import com.mems.dto.TransferCreateRequest;
import com.mems.dto.TransferDecisionRequest;
import com.mems.dto.TransferResponse;
import com.mems.security.RequirePermission;
import com.mems.service.TransferService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

/**
 * Yêu cầu chuyển phòng ban 4 bên (quy tắc 15).
 *
 * <p>Người được chuyển xem được yêu cầu của mình dù không có quyền nhân sự;
 * quyền quyết định từng bước được kiểm tra trong service theo đúng vai trò.</p>
 */
@RestController
@RequestMapping("/transfer-requests")
public class TransferController {
    private final TransferService service;

    public TransferController(TransferService service) {
        this.service = service;
    }

    @GetMapping("/inbox")
    public List<TransferResponse> inbox() {
        return service.inbox();
    }

    @GetMapping("/mine")
    public List<TransferResponse> mine() {
        return service.mine();
    }

    @GetMapping("/{id}")
    public TransferResponse detail(@PathVariable String id) {
        return service.detail(id);
    }

    @PostMapping
    @RequirePermission("employee.transfer")
    public ResponseEntity<TransferResponse> create(@Valid @RequestBody TransferCreateRequest request) {
        var created = service.create(request);
        return ResponseEntity.created(URI.create("/transfer-requests/" + created.id())).body(created);
    }

    @PostMapping("/{id}/steps/{step}/approve")
    public TransferResponse approve(@PathVariable String id, @PathVariable String step,
                                    @Valid @RequestBody(required = false) TransferDecisionRequest request) {
        return service.decide(id, step, true, request == null ? null : request.note());
    }

    @PostMapping("/{id}/steps/{step}/reject")
    public TransferResponse reject(@PathVariable String id, @PathVariable String step,
                                   @Valid @RequestBody(required = false) TransferDecisionRequest request) {
        return service.decide(id, step, false, request == null ? null : request.note());
    }

    @PostMapping("/{id}/cancel")
    public TransferResponse cancel(@PathVariable String id,
                                   @Valid @RequestBody(required = false) TransferDecisionRequest request) {
        return service.cancel(id, request == null ? null : request.note());
    }
}
