package com.mems.controller;

import com.mems.dto.StudentAccountResponse;
import com.mems.dto.StudentClassResponse;
import com.mems.dto.StudentRequest;
import com.mems.dto.StudentResponse;
import com.mems.dto.StudentUpdateRequest;
import com.mems.service.StudentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/students", "/students/"})
public class StudentController {
    private final StudentService service;

    public StudentController(StudentService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasRole('OWNER') or hasAuthority('student.view')")
    public Map<String, Object> list(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String classId,
        @RequestParam(required = false) String q
    ) {
        return service.list(page, size, status, classId, q);
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('student.self_view')")
    public StudentResponse me() {
        return service.getSelf();
    }

    @GetMapping("/me/classes")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('student.self_view')")
    public List<StudentClassResponse> myClasses() {
        return service.myClasses();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('student.view')")
    public StudentResponse get(@PathVariable String id) {
        return service.get(id);
    }

    @PostMapping("/{id}/account")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('student.create_account')")
    public ResponseEntity<StudentAccountResponse> createAccount(@PathVariable String id) {
        // HR-02: mật khẩu tạm trong body ⇒ cấm cache.
        return ResponseEntity.status(HttpStatus.CREATED)
            .headers(noStore()).body(service.createAccount(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('OWNER') or hasAuthority('student.create')")
    public ResponseEntity<StudentResponse> create(@Valid @RequestBody StudentRequest request) {
        StudentResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/students/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('student.edit')")
    public StudentResponse update(@PathVariable String id, @Valid @RequestBody StudentUpdateRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('student.delete')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        service.delete(id);
    }

    private HttpHeaders noStore() {
        HttpHeaders headers = new HttpHeaders();
        headers.setCacheControl("no-store");
        headers.setPragma("no-cache");
        return headers;
    }
}

