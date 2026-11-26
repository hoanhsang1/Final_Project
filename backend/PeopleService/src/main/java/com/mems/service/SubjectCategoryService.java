package com.mems.service;

import com.mems.dto.SubjectCategoryRequest;
import com.mems.dto.SubjectCategoryResponse;
import com.mems.dto.SubjectCategoryStatusRequest;
import com.mems.repository.SubjectCategoryRepository;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class SubjectCategoryService {

    private final SubjectCategoryRepository repository;
    private final Actor actor;
    private final OrganizationModuleGuard moduleGuard;
    private final PeopleAuditService audit;

    public SubjectCategoryService(SubjectCategoryRepository repository,
                                  Actor actor,
                                  OrganizationModuleGuard moduleGuard,
                                  PeopleAuditService audit) {
        this.repository = repository;
        this.actor = actor;
        this.moduleGuard = moduleGuard;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<SubjectCategoryResponse> list(boolean includeInactive) {
        String orgId = actor.orgId();
        moduleGuard.requireModuleReadable(orgId, SubjectService.MODULE_STUDENT_MANAGEMENT);
        boolean showInactive = includeInactive
            && (actor.owner() || actor.hasPermission("subject.manage"));
        return repository.list(orgId, showInactive);
    }

    @Transactional
    public SubjectCategoryResponse create(SubjectCategoryRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, SubjectService.MODULE_STUDENT_MANAGEMENT);

        SubjectCategoryResponse created =
            repository.create(orgId, request.name(), actor.userId());
        audit.record(orgId, actor.userId(), "SUBJECT_CATEGORY_CREATED", created.id(), created);
        return created;
    }

    @Transactional
    public SubjectCategoryResponse update(String id, SubjectCategoryRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, SubjectService.MODULE_STUDENT_MANAGEMENT);

        SubjectCategoryResponse before = repository.require(id, orgId);
        SubjectCategoryResponse updated =
            repository.update(id, orgId, request.name(), actor.userId());
        audit.record(orgId, actor.userId(), "SUBJECT_CATEGORY_UPDATED", id,
            Map.of("before", before, "after", updated));
        return updated;
    }

    @Transactional
    public SubjectCategoryResponse updateStatus(String id, SubjectCategoryStatusRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, SubjectService.MODULE_STUDENT_MANAGEMENT);

        SubjectCategoryResponse updated =
            repository.setActive(id, orgId, request.active(), actor.userId());
        audit.record(orgId, actor.userId(), "SUBJECT_CATEGORY_STATUS_CHANGED", id,
            Map.of("active", updated.active(), "subjectsUsingCategory", updated.subjectCount()));
        return updated;
    }
}
