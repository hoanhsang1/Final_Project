package com.mems.controller;

import com.mems.dto.DepartmentModuleImpactResponse;
import com.mems.dto.DepartmentRequest;
import com.mems.dto.DepartmentResponse;
import com.mems.dto.PermissionResponse;
import com.mems.security.RequirePermission;
import com.mems.service.DepartmentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping({"/departments", "/departments/"})
public class DepartmentController {
    private final DepartmentService service;

    public DepartmentController(DepartmentService service) {
        this.service = service;
    }

    @GetMapping
    @RequirePermission("department.view")
    public List<DepartmentResponse> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    @RequirePermission(value = "department.view", department = "id")
    public DepartmentResponse get(@PathVariable String id) {
        return service.get(id);
    }

    @GetMapping("/{id}/available-permissions")
    @RequirePermission(value = "department.view", department = "id")
    public List<PermissionResponse> availablePermissions(@PathVariable String id) {
        return service.availablePermissions(id);
    }

    @GetMapping("/{id}/module-impact")
    @RequirePermission("department.manage")
    public DepartmentModuleImpactResponse moduleImpact(
        @PathVariable String id,
        @RequestParam(required = false) List<String> moduleCodes
    ) {
        return service.moduleImpact(id, moduleCodes);
    }

    @PostMapping
    @RequirePermission("department.manage")
    public ResponseEntity<DepartmentResponse> create(@Valid @RequestBody DepartmentRequest request) {
        DepartmentResponse result = service.create(request);
        return ResponseEntity.created(URI.create("/departments/" + result.id())).body(result);
    }

    @PutMapping("/{id}")
    @RequirePermission("department.manage")
    public DepartmentResponse update(@PathVariable String id, @Valid @RequestBody DepartmentRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @RequirePermission("department.manage")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        service.delete(id);
    }
}
