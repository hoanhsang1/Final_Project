package com.mems.controller;
import com.mems.dto.*;
import com.mems.service.DepartmentService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/departments")
public class DepartmentController {
    private final DepartmentService service;
    public DepartmentController(DepartmentService service) { this.service=service; }
    @GetMapping @PreAuthorize("hasRole('OWNER') or hasAuthority('PEOPLE_VIEW')")
    public List<DepartmentResponse> list() { return service.list(); }
    @PostMapping @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<DepartmentResponse> create(@Valid @RequestBody DepartmentRequest request) {
        var result=service.create(request);
        return ResponseEntity.created(java.net.URI.create("/departments/"+result.id())).body(result);
    }
    @PutMapping("/{id}") @PreAuthorize("hasRole('OWNER')")
    public DepartmentResponse update(@PathVariable String id,@Valid @RequestBody DepartmentRequest request) {
        return service.update(id,request);
    }
    @DeleteMapping("/{id}") @PreAuthorize("hasRole('OWNER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) { service.delete(id); }
}
