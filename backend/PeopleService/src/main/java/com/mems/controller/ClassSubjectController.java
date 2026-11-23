package com.mems.controller;

import com.mems.dto.*;
import com.mems.service.ClassSubjectService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/classes/{classId}/subjects")
public class ClassSubjectController {

    private static final String READ = "hasRole('OWNER') or hasAnyAuthority('class.view','class.edit','subject.view','subject.manage')";
    private static final String WRITE = "hasRole('OWNER') or hasAnyAuthority('class.edit','subject.manage')";

    private final ClassSubjectService service;

    public ClassSubjectController(ClassSubjectService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize(READ)
    public ClassSubjectListResponse list(@PathVariable String classId) {
        return service.list(classId);
    }

    @PostMapping
    @PreAuthorize(WRITE)
    public ClassSubjectResponse add(@PathVariable String classId,
                                    @Valid @RequestBody ClassSubjectCreateRequest request) {
        return service.addSubject(classId, request);
    }

    @PutMapping("/{subjectId}")
    @PreAuthorize(WRITE)
    public ClassSubjectResponse update(@PathVariable String classId,
                                       @PathVariable String subjectId,
                                       @Valid @RequestBody ClassSubjectUpdateRequest request) {
        return service.updateSubject(classId, subjectId, request);
    }

    @DeleteMapping("/{subjectId}")
    @PreAuthorize(WRITE)
    public ResponseEntity<Void> remove(@PathVariable String classId,
                                       @PathVariable String subjectId) {
        service.removeSubject(classId, subjectId);
        return ResponseEntity.noContent().build();
    }
}
