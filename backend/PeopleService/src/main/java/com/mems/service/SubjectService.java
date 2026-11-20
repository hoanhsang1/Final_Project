package com.mems.service;

import com.mems.dto.*;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.SubjectRepository;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class SubjectService {

    public static final String MODULE_STUDENT_MANAGEMENT = "STUDENT_MANAGEMENT";

    private final SubjectRepository repository;
    private final Actor actor;
    private final OrganizationModuleGuard moduleGuard;
    private final PeopleAuditService audit;

    public SubjectService(SubjectRepository repository,
                          Actor actor,
                          OrganizationModuleGuard moduleGuard,
                          PeopleAuditService audit) {
        this.repository = repository;
        this.actor = actor;
        this.moduleGuard = moduleGuard;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<SubjectResponse> list(String q, boolean includeInactive) {
        String orgId = actor.orgId();
        moduleGuard.requireModuleReadable(orgId, MODULE_STUDENT_MANAGEMENT);
        boolean showInactive = includeInactive
            && (actor.owner() || actor.hasPermission("subject.manage"));
        return repository.list(orgId, q, showInactive);
    }

    @Transactional(readOnly = true)
    public SubjectResponse get(String id) {
        String orgId = actor.orgId();
        moduleGuard.requireModuleReadable(orgId, MODULE_STUDENT_MANAGEMENT);
        return repository.require(id, orgId);
    }

    @Transactional
    public SubjectResponse create(SubjectRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, MODULE_STUDENT_MANAGEMENT);

        String code = request.code() == null ? null : request.code().trim();
        if (code != null && !code.isEmpty()) {
            Optional<SubjectResponse> existing = repository.findByCode(orgId, code);
            if (existing.isPresent()) {
                throw new AppException(ErrorCode.SUBJECT_CODE_EXISTS, "Mã môn học đã tồn tại trong tổ chức");
            }
        }

        SubjectResponse created = repository.create(orgId, code, request.name(),
            request.description(), actor.userId());
        audit.record(orgId, actor.userId(), "SUBJECT_CREATED", created.id(), created);
        return created;
    }

    @Transactional
    public SubjectResponse update(String id, SubjectRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, MODULE_STUDENT_MANAGEMENT);

        SubjectResponse before = repository.require(id, orgId);

        String code = request.code() == null ? null : request.code().trim();
        if (code != null && !code.isEmpty()) {
            Optional<SubjectResponse> existing = repository.findByCode(orgId, code);
            if (existing.isPresent() && !existing.get().id().equals(id)) {
                throw new AppException(ErrorCode.SUBJECT_CODE_EXISTS, "Mã môn học đã tồn tại trong tổ chức");
            }
        }

        SubjectResponse updated = repository.update(id, orgId, code, request.name(),
            request.description(), actor.userId());
        audit.record(orgId, actor.userId(), "SUBJECT_UPDATED", id,
            Map.of("before", before, "after", updated));
        return updated;
    }

    @Transactional
    public SubjectResponse updateStatus(String id, SubjectStatusRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, MODULE_STUDENT_MANAGEMENT);

        SubjectResponse updated = repository.setActive(id, orgId, request.active(), actor.userId());
        audit.record(orgId, actor.userId(), "SUBJECT_STATUS_CHANGED", id,
            Map.of("active", updated.active(),
                "classesUsingSubject", repository.classUsage(id, orgId)));
        return updated;
    }

    @Transactional(readOnly = true)
    public SubjectCodeCheckResponse checkCode(String code, String excludeId) {
        if (code == null || code.isBlank()) {
            throw new AppException(ErrorCode.CODE_REQUIRED, "Code is required");
        }
        String orgId = actor.orgId();
        moduleGuard.requireModuleReadable(orgId, MODULE_STUDENT_MANAGEMENT);

        Optional<SubjectResponse> existing = repository.findByCode(orgId, code.trim());
        if (existing.isEmpty()) {
            return new SubjectCodeCheckResponse(code.trim(), true, null);
        }

        SubjectResponse found = existing.get();
        if (excludeId != null && !excludeId.isBlank() && found.id().equals(excludeId.trim())) {
            return new SubjectCodeCheckResponse(code.trim(), true, null);
        }

        return new SubjectCodeCheckResponse(code.trim(), false, found.id());
    }

    @Transactional(readOnly = true)
    public SubjectUsageResponse getUsage(String id) {
        String orgId = actor.orgId();
        moduleGuard.requireModuleReadable(orgId, MODULE_STUDENT_MANAGEMENT);
        return repository.getUsage(id, orgId);
    }
}
