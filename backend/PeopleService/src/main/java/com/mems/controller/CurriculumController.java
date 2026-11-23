package com.mems.controller;

import com.mems.dto.*;
import com.mems.service.CurriculumService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/curricula")
public class CurriculumController {

    private static final String READ = "hasRole('OWNER') or hasAnyAuthority('curriculum.view','curriculum.manage')";
    private static final String WRITE = "hasRole('OWNER') or hasAuthority('curriculum.manage')";

    private final CurriculumService service;

    public CurriculumController(CurriculumService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize(READ)
    public PageResponse<CurriculumResponse> list(
        @RequestParam(required = false) String q,
        @RequestParam(required = false) Boolean isActive,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int size) {
        return service.list(q, isActive, page, size);
    }

    @GetMapping("/{id}")
    @PreAuthorize(READ)
    public CurriculumResponse get(@PathVariable String id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize(WRITE)
    public ResponseEntity<CurriculumResponse> create(@Valid @RequestBody CurriculumRequest request) {
        CurriculumResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/curricula/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize(WRITE)
    public CurriculumResponse update(@PathVariable String id,
                                     @Valid @RequestBody CurriculumUpdateRequest request) {
        return service.update(id, request);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize(WRITE)
    public CurriculumResponse setActive(@PathVariable String id,
                                        @Valid @RequestBody CurriculumStatusRequest request) {
        return service.setActive(id, request.active());
    }

    @GetMapping("/{id}/subjects")
    @PreAuthorize(READ)
    public List<CurriculumSubjectResponse> listSubjects(@PathVariable String id) {
        return service.listSubjects(id);
    }

    @PostMapping("/{id}/subjects")
    @PreAuthorize(WRITE)
    public CurriculumSubjectResponse addSubject(@PathVariable String id,
                                                @Valid @RequestBody CurriculumSubjectRequest request) {
        return service.addSubject(id, request);
    }

    @PutMapping("/{id}/subjects/{subjectId}")
    @PreAuthorize(WRITE)
    public CurriculumSubjectResponse updateSubject(@PathVariable String id,
                                                   @PathVariable String subjectId,
                                                   @Valid @RequestBody CurriculumSubjectUpdateRequest request) {
        return service.updateSubject(id, subjectId, request);
    }

    @DeleteMapping("/{id}/subjects/{subjectId}")
    @PreAuthorize(WRITE)
    public ResponseEntity<Void> removeSubject(@PathVariable String id,
                                              @PathVariable String subjectId) {
        service.removeSubject(id, subjectId);
        return ResponseEntity.noContent().build();
    }
}
