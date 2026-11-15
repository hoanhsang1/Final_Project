package com.mems.controller;

import com.mems.dto.SpecialtyCreateRequest;
import com.mems.dto.SpecialtyResponse;
import com.mems.service.SpecialtyService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/specialties")
public class SpecialtyController {
    private final SpecialtyService service;

    public SpecialtyController(SpecialtyService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasRole('OWNER') or hasAnyAuthority('employee.view','employee.edit','class.assign_teacher')")
    public List<SpecialtyResponse> list(@RequestParam(required = false) String q) {
        return service.list(q);
    }

    @PostMapping
    @PreAuthorize("hasRole('OWNER') or hasAuthority('employee.edit')")
    @ResponseStatus(HttpStatus.CREATED)
    public SpecialtyResponse create(@Valid @RequestBody SpecialtyCreateRequest request) {
        return service.create(request);
    }
}
