package com.mems.controller;

import com.mems.service.AuditLogService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

/**
 * CC-06: nhật ký thao tác của tổ chức. Không nhận orgId từ query — luôn từ JWT.
 * Lỗi DB trả 500 qua GlobalExceptionHandler, không giả về danh sách rỗng.
 */
@RestController
@RequestMapping({"/audit-logs"})
@PreAuthorize("hasRole('OWNER') or hasAuthority('org.audit.view')")
public class AuditLogController {
    private final AuditLogService service;

    public AuditLogController(AuditLogService service) {
        this.service = service;
    }

    @GetMapping
    public Map<String, Object> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String actorUserId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        return service.list(page, size, action, actorUserId, from, to);
    }
}
