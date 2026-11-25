package com.mems.service;

import com.mems.dto.*;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.ClassSubjectRepository;
import com.mems.repository.SchoolClassRepository;
import com.mems.repository.SubjectRepository;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Set;

@Service
public class ClassSubjectService {

    private static final String MODULE = "STUDENT_MANAGEMENT";
    // States that allow subject management
    private static final Set<String> MODIFIABLE_STATES = Set.of("CHUA_BAT_DAU");

    private final ClassSubjectRepository repo;
    private final SchoolClassRepository classRepo;
    private final SubjectRepository subjectRepo;
    private final Actor actor;
    private final OrganizationModuleGuard moduleGuard;
    private final PeopleAuditService audit;

    public ClassSubjectService(ClassSubjectRepository repo, SchoolClassRepository classRepo,
                               SubjectRepository subjectRepo, Actor actor,
                               OrganizationModuleGuard moduleGuard, PeopleAuditService audit) {
        this.repo = repo;
        this.classRepo = classRepo;
        this.subjectRepo = subjectRepo;
        this.actor = actor;
        this.moduleGuard = moduleGuard;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public ClassSubjectListResponse list(String classId) {
        String orgId = actor.orgId();
        moduleGuard.requireModuleReadable(orgId, MODULE);
        classRepo.require(classId, orgId, false); // ensure class exists in org
        return repo.list(classId);
    }

    @Transactional
    public ClassSubjectResponse addSubject(String classId, ClassSubjectCreateRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, MODULE);
        SchoolClassResponse cls = classRepo.require(classId, orgId, false);
        checkModifiable(cls);

        // validate subject
        subjectRepo.requireActive(request.subjectId(), orgId);

        ClassSubjectResponse result = repo.addSubject(classId, request.subjectId(),
            request.plannedSessions(), request.sessionMinutes(),
            request.teacherId(), "MANUAL", null);
        audit.record(orgId, actor.userId(), "CLASS_SUBJECT_ADDED", classId, result);
        return result;
    }

    @Transactional
    public ClassSubjectResponse updateSubject(String classId, String subjectId,
                                              ClassSubjectUpdateRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, MODULE);
        SchoolClassResponse cls = classRepo.require(classId, orgId, false);
        checkModifiable(cls);
        if (cls.version() != request.version().longValue())
            throw new AppException(ErrorCode.VERSION_MISMATCH);

        ClassSubjectResponse result = repo.updateSubject(classId, subjectId,
            request.plannedSessions(), request.sessionMinutes(), request.teacherId());
        audit.record(orgId, actor.userId(), "CLASS_SUBJECT_UPDATED", classId, result);
        return result;
    }

    @Transactional
    public void removeSubject(String classId, String subjectId) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, MODULE);
        SchoolClassResponse cls = classRepo.require(classId, orgId, false);
        checkModifiable(cls);

        repo.removeSubject(classId, subjectId);
        audit.record(orgId, actor.userId(), "CLASS_SUBJECT_REMOVED", classId,
            Map.of("subjectId", subjectId));
    }

    private void checkModifiable(SchoolClassResponse cls) {
        if (!MODIFIABLE_STATES.contains(cls.status())) {
            throw new AppException(ErrorCode.CLASS_NOT_MODIFIABLE,
                "Chỉ có thể thay đổi môn học khi lớp ở trạng thái Chưa bắt đầu");
        }
    }
}
