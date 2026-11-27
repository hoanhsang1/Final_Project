package com.mems.controller;

import com.mems.dto.ApplyCurriculumRequest;
import com.mems.dto.ClassSubjectListResponse;
import com.mems.service.ClassSubjectService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Áp chương trình đào tạo cho lớp (khớp hợp đồng FE: PUT, trả danh sách môn sau khi áp). */
@RestController
@RequestMapping("/classes/{classId}/curriculum")
public class ClassCurriculumController {

    private static final String WRITE =
        "hasRole('OWNER') or hasAnyAuthority('class.edit','subject.manage')";

    private final ClassSubjectService service;

    public ClassCurriculumController(ClassSubjectService service) {
        this.service = service;
    }

    @PutMapping
    @PreAuthorize(WRITE)
    public ClassSubjectListResponse apply(@PathVariable String classId,
                                          @Valid @RequestBody ApplyCurriculumRequest request) {
        return service.applyCurriculum(classId, request);
    }
}
