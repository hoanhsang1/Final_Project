package com.mems.service;

import com.mems.dto.*;
import com.mems.repository.CurriculumRepository;
import com.mems.repository.SubjectRepository;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class CurriculumService {

    private static final String MODULE = "STUDENT_MANAGEMENT";

    private final CurriculumRepository repo;
    private final SubjectRepository subjectRepo;
    private final Actor actor;
    private final OrganizationModuleGuard moduleGuard;
    private final PeopleAuditService audit;

    public CurriculumService(CurriculumRepository repo, SubjectRepository subjectRepo,
                             Actor actor, OrganizationModuleGuard moduleGuard, PeopleAuditService audit) {
        this.repo = repo;
        this.subjectRepo = subjectRepo;
        this.actor = actor;
        this.moduleGuard = moduleGuard;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public PageResponse<CurriculumResponse> list(String q, Boolean isActive, int page, int size) {
        String orgId = actor.orgId();
        moduleGuard.requireModuleReadable(orgId, MODULE);
        return repo.list(orgId, q, isActive, page, size);
    }

    @Transactional(readOnly = true)
    public CurriculumResponse get(String id) {
        String orgId = actor.orgId();
        moduleGuard.requireModuleReadable(orgId, MODULE);
        return repo.require(id, orgId);
    }

    @Transactional
    public CurriculumResponse create(CurriculumRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, MODULE);
        CurriculumResponse created = repo.create(orgId, request.code(), request.name(),
            request.description(), request.gradeLevel(), request.majorCode(), actor.userId());
        audit.record(orgId, actor.userId(), "CURRICULUM_CREATED", created.id(), created);
        return created;
    }

    @Transactional
    public CurriculumResponse update(String id, CurriculumUpdateRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, MODULE);
        CurriculumResponse updated = repo.update(id, orgId, request.code(), request.name(),
            request.description(), request.gradeLevel(), request.majorCode(),
            request.version(), actor.userId());
        audit.record(orgId, actor.userId(), "CURRICULUM_UPDATED", id, updated);
        return updated;
    }

    @Transactional
    public CurriculumResponse setActive(String id, boolean active) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, MODULE);
        CurriculumResponse updated = repo.setActive(id, orgId, active, actor.userId());
        audit.record(orgId, actor.userId(), "CURRICULUM_STATUS_CHANGED", id, updated);
        return updated;
    }

    @Transactional(readOnly = true)
    public List<CurriculumSubjectResponse> listSubjects(String curriculumId) {
        String orgId = actor.orgId();
        moduleGuard.requireModuleReadable(orgId, MODULE);
        repo.require(curriculumId, orgId); // ensure curriculum exists in org
        return repo.listSubjects(curriculumId);
    }

    @Transactional
    public CurriculumSubjectResponse addSubject(String curriculumId, CurriculumSubjectRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, MODULE);
        repo.require(curriculumId, orgId);
        // validate subject exists and is active
        subjectRepo.requireActive(request.subjectId(), orgId);
        boolean required = request.isRequired() == null ? true : request.isRequired();
        CurriculumSubjectResponse result = repo.addSubject(curriculumId, request.subjectId(),
            request.sequenceNo(), request.requiredSessions(), request.sessionMinutes(),
            request.theoryHours(), request.practiceHours(), required,
            request.notes(), request.prerequisiteSubjectIds());
        audit.record(orgId, actor.userId(), "CURRICULUM_SUBJECT_ADDED", curriculumId, result);
        return result;
    }

    @Transactional
    public CurriculumSubjectResponse updateSubject(String curriculumId, String subjectId,
                                                   CurriculumSubjectUpdateRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, MODULE);
        repo.require(curriculumId, orgId);
        boolean required = request.isRequired() == null ? true : request.isRequired();
        CurriculumSubjectResponse result = repo.updateSubject(curriculumId, subjectId,
            request.sequenceNo(), request.requiredSessions(), request.sessionMinutes(),
            request.theoryHours(), request.practiceHours(), required,
            request.notes(), request.prerequisiteSubjectIds());
        audit.record(orgId, actor.userId(), "CURRICULUM_SUBJECT_UPDATED", curriculumId, result);
        return result;
    }

    @Transactional
    public void removeSubject(String curriculumId, String subjectId) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, MODULE);
        repo.require(curriculumId, orgId);
        repo.removeSubject(curriculumId, subjectId);
        audit.record(orgId, actor.userId(), "CURRICULUM_SUBJECT_REMOVED", curriculumId,
            Map.of("subjectId", subjectId));
    }
}
