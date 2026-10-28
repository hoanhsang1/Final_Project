package com.mems.controller;

import com.mems.service.AccountService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/accounts")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAccounts(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String organizationId,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String sort
    ) {
        return ResponseEntity.ok(
                accountService.getAccounts(page, size, organizationId, role, status, keyword, sort)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getAccount(@PathVariable String id) {
        return ResponseEntity.ok(accountService.getAccount(id));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createAccount(@RequestBody Map<String, Object> payload) {
        return ResponseEntity.status(HttpStatus.CREATED).body(accountService.createAccount(payload));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> updateStatus(
            @PathVariable String id,
            @RequestBody Map<String, Object> payload
    ) {
        String status = payload.get("status") != null ? payload.get("status").toString() : null;
        String reason = payload.get("reason") != null ? payload.get("reason").toString() : null;
        accountService.updateStatus(id, status, reason);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/role")
    public ResponseEntity<Void> updateRole(
            @PathVariable String id,
            @RequestBody Map<String, Object> payload
    ) {
        String role = payload.get("role") != null ? payload.get("role").toString() : null;
        accountService.updateRole(id, role);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<Void> resetPassword(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, Object> payload
    ) {
        String newPassword = payload != null && payload.get("new_password") != null
                ? payload.get("new_password").toString()
                : null;
        accountService.resetPassword(id, newPassword);
        return ResponseEntity.noContent().build();
    }
}

