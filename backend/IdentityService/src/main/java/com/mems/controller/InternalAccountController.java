package com.mems.controller;
import com.mems.dto.ProvisionAccountRequest;
import com.mems.service.AccountProvisioningService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/internal/accounts")
public class InternalAccountController {
    private final AccountProvisioningService service;
    public InternalAccountController(AccountProvisioningService service) { this.service=service; }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Map<String,String> create(@Valid @RequestBody ProvisionAccountRequest request) { return service.create(request); }
    @PostMapping("/{id}/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@PathVariable String id,@RequestParam String orgId) {
        // HR-02: mật khẩu tạm đi qua service nội bộ, cấm cache ở bất kỳ tầng trung gian nào.
        return ResponseEntity.ok()
            .header("Cache-Control","no-store").header("Pragma","no-cache")
            .body(service.resetPassword(id,orgId));
    }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id,@RequestParam String orgId) { service.compensate(id,orgId); }
    @PatchMapping("/{id}/disable") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void disable(@PathVariable String id,@RequestParam String orgId) { service.disable(id,orgId); }
    @PatchMapping("/{id}/enable") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void enable(@PathVariable String id,@RequestParam String orgId) { service.enable(id,orgId); }
}
