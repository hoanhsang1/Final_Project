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
    @GetMapping({"/permissions", "/permissions/"}) @PreAuthorize("hasRole('OWNER') or hasAnyAuthority('position.view','position.manage')")
    public List<PermissionResponse> permissions() { return service.permissions(); }
    @GetMapping({"/permission-bundles", "/permission-bundles/"})
    @PreAuthorize("hasRole('OWNER') or hasAnyAuthority('position.view','position.manage')")
    public List<PermissionBundleResponse> bundles() { return service.bundles(); }
    @GetMapping({"/positions", "/positions/"}) @PreAuthorize("hasRole('OWNER') or hasAnyAuthority('position.view','position.manage')")
    public List<PositionResponse> list() { return service.list(); }
    @PostMapping({"/positions", "/positions/"}) @PreAuthorize("hasRole('OWNER') or hasAuthority('position.manage')")
    public ResponseEntity<PositionResponse> create(@Valid @RequestBody PositionRequest request) {
        var result=service.create(request);
        return ResponseEntity.created(java.net.URI.create("/positions/"+result.id())).body(result);
    }
    @PutMapping("/positions/{id}") @PreAuthorize("hasRole('OWNER') or hasAuthority('position.manage')")
    public PositionResponse update(@PathVariable String id,@Valid @RequestBody PositionRequest request) {
        return service.update(id,request);
    }
    @DeleteMapping("/positions/{id}") @PreAuthorize("hasRole('OWNER') or hasAuthority('position.manage')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) { service.delete(id); }
    @GetMapping("/positions/{id}/impact") @PreAuthorize("hasRole('OWNER') or hasAuthority('position.view')")
    public PositionImpactResponse impact(@PathVariable String id) { return service.impact(id); }
    @PostMapping("/positions/{id}/clone") @PreAuthorize("hasRole('OWNER') or hasAuthority('position.manage')")
    public ResponseEntity<PositionCloneResponse> clone(@PathVariable String id,
                                                       @Valid @RequestBody PositionCloneRequest request) {
        var result=service.clone(id,request);
        return ResponseEntity.created(java.net.URI.create("/positions/"+result.position().id())).body(result);
    }
}
