package com.mems.service;

import com.mems.dto.StudentRequest;
import com.mems.dto.StudentResponse;
import com.mems.dto.StudentUpdateRequest;
import com.mems.repository.StudentRepository;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.util.Map;
import java.util.UUID;

@Service
public class StudentService {
    private final StudentRepository repository;
    private final Actor actor;
    private final OrganizationModuleGuard moduleGuard;
    private final PeopleAuditService audit;

    public StudentService(StudentRepository repository, Actor actor,
                          OrganizationModuleGuard moduleGuard, PeopleAuditService audit) {
        this.repository = repository;
        this.actor = actor;
        this.moduleGuard = moduleGuard;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> list(int page, int size, String status, String classId, String q) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");
        return repository.list(orgId, page, size, status, classId, q);
    }

    @Transactional(readOnly = true)
    public StudentResponse get(String id) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");
        return repository.require(id, orgId, false);
    }

    @Transactional
    public StudentResponse create(StudentRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");

        repository.checkStudentCodeAvailable(orgId, request.studentCode().trim());

        String id = UUID.randomUUID().toString();
        Date dob = request.dateOfBirth() != null ? Date.valueOf(request.dateOfBirth()) : null;
        String email = request.email() != null && !request.email().isBlank() ? request.email().trim().toLowerCase() : null;
        String phone = request.phone() != null && !request.phone().isBlank() ? request.phone().trim() : null;

        StudentResponse created = repository.create(
            id, orgId, request.studentCode().trim(), request.fullName().trim(),
            dob, email, phone, request.status(), actor.userId()
        );

        audit.record(orgId, actor.userId(), "STUDENT_CREATED", id, created);
        return created;
    }

    @Transactional
    public StudentResponse update(String id, StudentUpdateRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");

        StudentResponse before = repository.require(id, orgId, true);
        Date dob = request.dateOfBirth() != null ? Date.valueOf(request.dateOfBirth()) : null;
        String email = request.email() != null && !request.email().isBlank() ? request.email().trim().toLowerCase() : null;
        String phone = request.phone() != null && !request.phone().isBlank() ? request.phone().trim() : null;

        StudentResponse updated = repository.update(
            id, orgId, request.fullName().trim(), dob, email, phone, request.status()
        );

        audit.record(orgId, actor.userId(), "STUDENT_UPDATED", id, Map.of("before", before, "after", updated));
        return updated;
    }

    @Transactional
    public void delete(String id) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");

        StudentResponse before = repository.require(id, orgId, true);
        repository.delete(id, orgId);

        audit.record(orgId, actor.userId(), "STUDENT_DELETED", id, before);
    }
}

