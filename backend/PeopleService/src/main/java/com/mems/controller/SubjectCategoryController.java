package com.mems.controller;

import com.mems.dto.SubjectCategoryRequest;
import com.mems.dto.SubjectCategoryResponse;
import com.mems.dto.SubjectCategoryStatusRequest;
import com.mems.service.SubjectCategoryService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/subject-categories")
public class SubjectCategoryController {

    // Cùng quyền với danh mục môn học: đọc subject.view/subject.manage, ghi subject.manage.
    private static final String READ = "hasRole('OWNER') or hasAnyAuthority('subject.view','subject.manage')";
    private static final String WRITE = "hasRole('OWNER') or hasAuthority('subject.manage')";

    private final SubjectCategoryService service;

    public SubjectCategoryController(SubjectCategoryService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize(READ)
    public List<SubjectCategoryResponse> list(
        @RequestParam(defaultValue = "false") boolean includeInactive) {
        return service.list(includeInactive);
    }

    @PostMapping
    @PreAuthorize(WRITE)
    public ResponseEntity<SubjectCategoryResponse> create(
        @Valid @RequestBody SubjectCategoryRequest request) {
        SubjectCategoryResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/subject-categories/" + created.id()))
            .body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize(WRITE)
    public SubjectCategoryResponse update(@PathVariable String id,
                                          @Valid @RequestBody SubjectCategoryRequest request) {
        return service.update(id, request);
    }

    /**
     * Ngừng/khôi phục danh mục. Môn đang gắn vẫn giữ tham chiếu; chỉ không thể
     * gán danh mục này cho môn khác cho tới khi kích hoạt lại.
     */
    @PatchMapping("/{id}/status")
    @PreAuthorize(WRITE)
    public SubjectCategoryResponse updateStatus(
        @PathVariable String id,
        @Valid @RequestBody SubjectCategoryStatusRequest request) {
        return service.updateStatus(id, request);
    }
}
