package com.mems.service;

import com.mems.dto.SchoolClassRequest;
import com.mems.dto.SchoolClassResponse;
import com.mems.dto.SchoolClassUpdateRequest;
import com.mems.dto.StudentResponse;
import com.mems.repository.SchoolClassRepository;
import com.mems.repository.StudentRepository;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class SchoolClassService {
    private final SchoolClassRepository repository;
    private final StudentRepository studentRepository;
    private final Actor actor;
    private final OrganizationModuleGuard moduleGuard;
    private final PeopleAuditService audit;

    public SchoolClassService(SchoolClassRepository repository, StudentRepository studentRepository,
                              Actor actor, OrganizationModuleGuard moduleGuard, PeopleAuditService audit) {
        this.repository = repository;
        this.studentRepository = studentRepository;
        this.actor = actor;
        this.moduleGuard = moduleGuard;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> list(int page, int size, String q, String status) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");
        return repository.list(orgId, page, size, q, status);
    }

    @Transactional(readOnly = true)
    public SchoolClassResponse get(String id) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");
        return repository.require(id, orgId, false);
    }

    @Transactional
    public SchoolClassResponse create(SchoolClassRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");

        repository.checkClassCodeAvailable(orgId, request.classCode().trim());

        String id = UUID.randomUUID().toString();
        SchoolClassResponse created = repository.create(
            id, orgId, request.classCode().trim(), request.name().trim(),
            request.academicYear() != null ? request.academicYear().trim() : null,
            request.status(), actor.userId()
        );

        audit.record(orgId, actor.userId(), "CLASS_CREATED", id, created);
        return created;
    }

    @Transactional
    public SchoolClassResponse update(String id, SchoolClassUpdateRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");

        SchoolClassResponse before = repository.require(id, orgId, true);
        SchoolClassResponse updated = repository.update(
            id, orgId, request.name().trim(),
            request.academicYear() != null ? request.academicYear().trim() : null,
            request.status()
        );

        audit.record(orgId, actor.userId(), "CLASS_UPDATED", id, Map.of("before", before, "after", updated));
        return updated;
    }

    @Transactional
    public void delete(String id) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");

        SchoolClassResponse before = repository.require(id, orgId, true);
        repository.delete(id, orgId);

        audit.record(orgId, actor.userId(), "CLASS_DELETED", id, before);
    }

    @Transactional(readOnly = true)
    public List<StudentResponse> listStudents(String classId) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");
        repository.require(classId, orgId, false);
        return studentRepository.findByClassId(classId, orgId);
    }

    @Transactional
    public void addStudent(String classId, String studentId) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");

        repository.require(classId, orgId, true);
        studentRepository.require(studentId, orgId, true);

        repository.enrollStudent(classId, studentId, orgId);

        audit.record(orgId, actor.userId(), "CLASS_STUDENT_ADDED", classId,
            Map.of("classId", classId, "studentId", studentId));
    }

    @Transactional
    public void removeStudent(String classId, String studentId) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");

        repository.require(classId, orgId, true);
        studentRepository.require(studentId, orgId, false);

        repository.removeStudent(classId, studentId, orgId);

        audit.record(orgId, actor.userId(), "CLASS_STUDENT_REMOVED", classId,
            Map.of("classId", classId, "studentId", studentId));
    }
}

