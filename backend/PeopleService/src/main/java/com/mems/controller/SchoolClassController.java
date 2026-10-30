package com.mems.controller;

import com.mems.dto.SchoolClassRequest;
import com.mems.dto.SchoolClassResponse;
import com.mems.dto.SchoolClassUpdateRequest;
import com.mems.dto.StudentResponse;
import com.mems.service.SchoolClassService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/classes")
public class SchoolClassController {
    private final SchoolClassService service;

    public SchoolClassController(SchoolClassService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasRole('OWNER') or hasAuthority('CLASS_VIEW')")
    public Map<String, Object> list(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) String q,
        @RequestParam(required = false) String status
    ) {
        return service.list(page, size, q, status);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('CLASS_VIEW')")
    public SchoolClassResponse get(@PathVariable String id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('OWNER') or hasAuthority('CLASS_CREATE')")
    public ResponseEntity<SchoolClassResponse> create(@Valid @RequestBody SchoolClassRequest request) {
        SchoolClassResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/classes/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('CLASS_EDIT')")
    public SchoolClassResponse update(@PathVariable String id, @Valid @RequestBody SchoolClassUpdateRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('CLASS_DELETE')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        service.delete(id);
    }

    @GetMapping("/{id}/students")
    @PreAuthorize("hasRole('OWNER') or (hasAuthority('CLASS_VIEW') and hasAuthority('STUDENT_VIEW'))")
    public List<StudentResponse> listStudents(@PathVariable String id) {
        return service.listStudents(id);
    }

    @PutMapping("/{id}/students/{studentId}")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('CLASS_EDIT')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void addStudent(@PathVariable String id, @PathVariable String studentId) {
        service.addStudent(id, studentId);
    }

    @DeleteMapping("/{id}/students/{studentId}")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('CLASS_EDIT')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeStudent(@PathVariable String id, @PathVariable String studentId) {
        service.removeStudent(id, studentId);
    }
}

