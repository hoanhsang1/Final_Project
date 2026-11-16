package com.mems.service;

import com.mems.client.IdentityClient;
import com.mems.dto.StudentAccountResponse;
import com.mems.dto.StudentClassResponse;
import com.mems.dto.StudentRequest;
import com.mems.dto.StudentResponse;
import com.mems.dto.StudentUpdateRequest;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.StudentRepository;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.sql.Date;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class StudentService {
    private final StudentRepository repository;
    private final Actor actor;
    private final OrganizationModuleGuard moduleGuard;
    private final PeopleAuditService audit;
    private final IdentityClient identity;
    private final SecureRandom random = new SecureRandom();

    public StudentService(StudentRepository repository, Actor actor,
                          OrganizationModuleGuard moduleGuard, PeopleAuditService audit,
                          IdentityClient identity) {
        this.repository = repository;
        this.actor = actor;
        this.moduleGuard = moduleGuard;
        this.audit = audit;
        this.identity = identity;
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

        String studentCode = request.studentCode() == null || request.studentCode().isBlank()
            ? repository.nextStudentCode(orgId)
            : request.studentCode().trim();

        repository.checkStudentCodeAvailable(orgId, studentCode);

        String id = UUID.randomUUID().toString();
        Date dob = request.dateOfBirth() != null ? Date.valueOf(request.dateOfBirth()) : null;
        String email = request.email() != null && !request.email().isBlank() ? request.email().trim().toLowerCase() : null;
        String phone = request.phone() != null && !request.phone().isBlank() ? request.phone().trim() : null;

        StudentResponse created = repository.create(
            id, orgId, studentCode, request.fullName().trim(),
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

    /** Tạo tài khoản đăng nhập cho hồ sơ học sinh đã có (quy tắc 12). */
    public StudentAccountResponse createAccount(String id) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");

        StudentResponse student = repository.require(id, orgId, false);
        if (student.accountCreatedAt() != null) {
            throw new AppException(ErrorCode.STUDENT_ACCOUNT_EXISTS);
        }
        if (student.email() == null || student.email().isBlank()) {
            throw new AppException(ErrorCode.STUDENT_EMAIL_REQUIRED);
        }
        String username = student.email().trim().toLowerCase();
        if (username.length() > 100) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "email: too long to use as username");
        }

        byte[] bytes = new byte[24];
        random.nextBytes(bytes);
        String password = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        identity.createStudentAccount(id, orgId, username, username, password, actor.userId());
        repository.markAccountCreated(id, orgId, username);

        audit.record(orgId, actor.userId(), "STUDENT_ACCOUNT_CREATED", id,
            Map.of("username", username));
        return new StudentAccountResponse(id, username, password);
    }

    /** Hồ sơ của chính người đang đăng nhập — chỉ đọc, không cần module quản trị. */
    @Transactional(readOnly = true)
    public StudentResponse getSelf() {
        return repository.require(actor.userId(), actor.orgId(), false);
    }

    @Transactional(readOnly = true)
    public List<StudentClassResponse> myClasses() {
        return repository.classesOf(actor.userId(), actor.orgId());
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

