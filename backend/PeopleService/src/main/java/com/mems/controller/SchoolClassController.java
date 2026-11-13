package com.mems.controller;

import com.mems.dto.ClassCancelRequest;
import com.mems.dto.ClassCloseEventResponse;
import com.mems.dto.ClassCloseRejectRequest;
import com.mems.dto.ClassCloseRequest;
import com.mems.dto.ClassReopenRequest;
import com.mems.dto.ClassStatusLogResponse;
import com.mems.dto.ClassTeacherAssignRequest;
import com.mems.dto.SchoolClassRequest;
import com.mems.dto.SchoolClassResponse;
import com.mems.dto.SchoolClassUpdateRequest;
import com.mems.dto.StudentResponse;
import com.mems.service.ClassStatusService;
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
@RequestMapping({"/classes", "/classes/"})
public class SchoolClassController {
    private final SchoolClassService service;
    private final ClassStatusService statusService;

    public SchoolClassController(SchoolClassService service, ClassStatusService statusService) {
        this.service = service;
        this.statusService = statusService;
    }

    @GetMapping
    @PreAuthorize("hasRole('OWNER') or hasAuthority('CLASS_VIEW')")
    public Map<String, Object> list(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) String q,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "false") boolean selectable
    ) {
        return service.list(page, size, q, status, selectable);
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

    @PutMapping("/{id}/teacher")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('CLASS_ASSIGN_TEACHER')")
    public SchoolClassResponse assignTeacher(@PathVariable String id,
                                             @Valid @RequestBody ClassTeacherAssignRequest request) {
        return service.assignTeacher(id, request);
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('CLASS_CANCEL')")
    public SchoolClassResponse cancel(@PathVariable String id,
                                      @Valid @RequestBody ClassCancelRequest request) {
        return statusService.cancel(id, request);
    }

    @GetMapping("/{id}/status-logs")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('CLASS_VIEW')")
    public List<ClassStatusLogResponse> statusLogs(@PathVariable String id) {
        return statusService.statusLogs(id);
    }

    @PostMapping("/{id}/close-requests")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('CLASS_CLOSE_REQUEST')")
    public SchoolClassResponse requestClose(@PathVariable String id,
                                            @Valid @RequestBody ClassCloseRequest request) {
        return statusService.requestClose(id, request);
    }

    @PostMapping("/{id}/close-requests/approve")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('CLASS_CLOSE_APPROVE')")
    public SchoolClassResponse approveClose(@PathVariable String id) {
        return statusService.approveClose(id);
    }

    @PostMapping("/{id}/close-requests/reject")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('CLASS_CLOSE_APPROVE')")
    public SchoolClassResponse rejectClose(@PathVariable String id,
                                           @Valid @RequestBody ClassCloseRejectRequest request) {
        return statusService.rejectClose(id, request);
    }

    @PostMapping("/{id}/reopen")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('CLASS_REOPEN')")
    public SchoolClassResponse reopen(@PathVariable String id,
                                      @Valid @RequestBody ClassReopenRequest request) {
        return statusService.reopen(id, request);
    }

    @GetMapping("/{id}/close-events")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('CLASS_VIEW')")
    public List<ClassCloseEventResponse> closeEvents(@PathVariable String id) {
        return statusService.closeEvents(id);
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

