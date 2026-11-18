package com.mems.controller;

import com.mems.dto.SubjectRequest;
import com.mems.dto.SubjectResponse;
import com.mems.dto.SubjectStatusRequest;
import com.mems.repository.SubjectRepository;
import com.mems.security.Actor;
import com.mems.service.PeopleAuditService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/subjects")
public class SubjectController {
    private static final String READ =
        "hasRole('OWNER') or hasAnyAuthority('subject.view','subject.manage','class.view','class.create',"
            + "'student.view','class.assign_teacher','class.teacher.reassign')";

    private final SubjectRepository subjects;
    private final PeopleAuditService audit;
    private final Actor actor;

    public SubjectController(SubjectRepository subjects, PeopleAuditService audit, Actor actor) {
        this.subjects = subjects;
        this.audit = audit;
        this.actor = actor;
    }

    @GetMapping
    @PreAuthorize(READ)
    public List<SubjectResponse> list(@RequestParam(required = false) String q,
                                      @RequestParam(defaultValue = "false") boolean includeInactive) {
        boolean showInactive = includeInactive
            && (actor.owner() || actor.hasPermission("subject.manage"));
        return subjects.list(actor.orgId(), q, showInactive);
    }

    @GetMapping("/{id}")
    @PreAuthorize(READ)
    public SubjectResponse get(@PathVariable String id) {
        return subjects.require(id, actor.orgId());
    }

    @PostMapping
    @PreAuthorize("hasRole('OWNER') or hasAuthority('subject.manage')")
    public ResponseEntity<SubjectResponse> create(@Valid @RequestBody SubjectRequest request) {
        String orgId = actor.orgId();
        SubjectResponse created = subjects.create(orgId, request.code(), request.name(),
            request.description(), actor.userId());
        audit.record(orgId, actor.userId(), "SUBJECT_CREATED", created.id(), created);
        return ResponseEntity.created(URI.create("/subjects/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('subject.manage')")
    public SubjectResponse update(@PathVariable String id, @Valid @RequestBody SubjectRequest request) {
        String orgId = actor.orgId();
        SubjectResponse before = subjects.require(id, orgId);
        SubjectResponse updated = subjects.update(id, orgId, request.code(), request.name(),
            request.description(), actor.userId());
        audit.record(orgId, actor.userId(), "SUBJECT_UPDATED", id,
            java.util.Map.of("before", before, "after", updated));
        return updated;
    }

    /**
     * Ngừng/khôi phục hoạt động. Lớp đang dùng môn vẫn giữ tham chiếu (FK), chỉ không
     * thể chọn môn này cho lớp mới cho tới khi kích hoạt lại.
     */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('OWNER') or hasAuthority('subject.manage')")
    public SubjectResponse updateStatus(@PathVariable String id,
                                        @Valid @RequestBody SubjectStatusRequest request) {
        String orgId = actor.orgId();
        SubjectResponse updated = subjects.setActive(id, orgId, request.active(), actor.userId());
        audit.record(orgId, actor.userId(), "SUBJECT_STATUS_CHANGED", id,
            java.util.Map.of("active", updated.active(),
                "classesUsingSubject", subjects.classUsage(id, orgId)));
        return updated;
    }
}
