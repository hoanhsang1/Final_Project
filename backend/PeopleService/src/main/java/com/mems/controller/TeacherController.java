package com.mems.controller;

import com.mems.dto.*;
import com.mems.service.TeacherService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping("/teachers")
public class TeacherController {
    private final TeacherService service;

    public TeacherController(TeacherService service) {
        this.service = service;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PEOPLE_EDIT')")
    public ResponseEntity<CreatedTeacherResponse> create(@Valid @RequestBody TeacherCreateRequest request) {
        var created = service.create(request);
        return ResponseEntity.created(URI.create("/teachers/" + created.userId())).body(created);
    }

    @GetMapping
    @PreAuthorize("hasRole('OWNER') or hasAnyAuthority('PEOPLE_VIEW','PEOPLE_EDIT')")
    public Map<String, Object> list(@RequestParam(defaultValue = "1") int page,
                                    @RequestParam(defaultValue = "20") int size,
                                    @RequestParam(required = false) String q,
                                    @RequestParam(required = false) String specialtyId,
                                    @RequestParam(required = false) String teachingStatus) {
        return service.list(page, size, q, specialtyId, teachingStatus);
    }

    @GetMapping("/assignable")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('CLASS_ASSIGN_TEACHER')")
    public Map<String, Object> assignable(@RequestParam(defaultValue = "1") int page,
                                          @RequestParam(defaultValue = "20") int size,
                                          @RequestParam(required = false) String q) {
        return service.assignable(q, page, size);
    }

    @GetMapping("/{staffId}")
    @PreAuthorize("hasRole('OWNER') or hasAnyAuthority('PEOPLE_VIEW','PEOPLE_EDIT')")
    public TeacherDetailResponse get(@PathVariable String staffId) {
        return service.get(staffId);
    }

    @PutMapping("/{staffId}")
    @PreAuthorize("hasAuthority('PEOPLE_EDIT')")
    public TeacherDetailResponse update(@PathVariable String staffId,
                                        @Valid @RequestBody TeacherUpdateRequest request) {
        return service.update(staffId, request);
    }
}
