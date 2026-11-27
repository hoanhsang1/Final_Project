package com.mems.controller;

import com.mems.dto.*;
import com.mems.service.SubjectService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/subjects")
public class SubjectController {

    // D-05 & F-MAJ-03: READ chỉ cho OWNER hoặc subject.view / subject.manage ở ORGANIZATION scope.
    // Không kế thừa từ class.view, class.create, student.view, class.assign_teacher, class.teacher.reassign.
    private static final String READ = "hasRole('OWNER') or hasAnyAuthority('subject.view','subject.manage')";

    private final SubjectService service;

    public SubjectController(SubjectService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize(READ)
    public List<SubjectResponse> list(@RequestParam(required = false) String q,
                                      @RequestParam(defaultValue = "false") boolean includeInactive) {
        return service.list(q, includeInactive);
    }

    @GetMapping("/check-code")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('subject.manage')")
    public SubjectCodeCheckResponse checkCode(@RequestParam String code,
                                              @RequestParam(required = false) String excludeId) {
        return service.checkCode(code, excludeId);
    }

    @GetMapping("/{id}")
    @PreAuthorize(READ)
    public SubjectResponse get(@PathVariable String id) {
        return service.get(id);
    }

    @GetMapping("/{id}/usage")
    @PreAuthorize(READ)
    public SubjectUsageResponse getUsage(@PathVariable String id) {
        return service.getUsage(id);
    }

    /** Giáo viên đủ điều kiện dạy môn (D1) cho bộ chọn ở màn hình lớp học. */
    @GetMapping("/{id}/eligible-teachers")
    @PreAuthorize("hasRole('OWNER') or hasAnyAuthority("
        + "'class.view','class.edit','subject.view','subject.manage','class.assign_teacher')")
    public List<EligibleTeacherInfo> eligibleTeachers(@PathVariable String id) {
        return service.eligibleTeachers(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('OWNER') or hasAuthority('subject.manage')")
    public ResponseEntity<SubjectResponse> create(@Valid @RequestBody SubjectRequest request) {
        SubjectResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/subjects/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('subject.manage')")
    public SubjectResponse update(@PathVariable String id, @Valid @RequestBody SubjectRequest request) {
        return service.update(id, request);
    }

    /**
     * Ngừng/khôi phục hoạt động. Lớp đang dùng môn vẫn giữ tham chiếu (FK), chỉ không
     * thể chọn môn này cho lớp mới cho tới khi kích hoạt lại.
     */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('subject.manage')")
    public SubjectResponse updateStatus(@PathVariable String id,
                                        @Valid @RequestBody SubjectStatusRequest request) {
        return service.updateStatus(id, request);
    }
}
