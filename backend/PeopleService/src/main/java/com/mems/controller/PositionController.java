package com.mems.controller;
import com.mems.dto.*;
import com.mems.service.PositionService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
public class PositionController {
    private final PositionService service;
    public PositionController(PositionService service) { this.service=service; }
    @GetMapping({"/permissions", "/permissions/"}) @PreAuthorize("hasAnyRole('OWNER','MANAGER','STAFF')")
    public List<PermissionResponse> permissions() { return service.permissions(); }
    @GetMapping({"/positions", "/positions/"}) @PreAuthorize("hasAnyRole('OWNER','MANAGER','STAFF')")
    public List<PositionResponse> list() { return service.list(); }
    @PostMapping({"/positions", "/positions/"}) @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<PositionResponse> create(@Valid @RequestBody PositionRequest request) {
        var result=service.create(request);
        return ResponseEntity.created(java.net.URI.create("/positions/"+result.id())).body(result);
    }
    @PutMapping("/positions/{id}") @PreAuthorize("hasRole('OWNER')")
    public PositionResponse update(@PathVariable String id,@Valid @RequestBody PositionRequest request) {
        return service.update(id,request);
    }
    @DeleteMapping("/positions/{id}") @PreAuthorize("hasRole('OWNER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) { service.delete(id); }
}
