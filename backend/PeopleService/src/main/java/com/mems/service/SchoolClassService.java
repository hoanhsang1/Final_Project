package com.mems.service;

import com.mems.dto.ClassTeacherAssignRequest;
import com.mems.dto.SchoolClassRequest;
import com.mems.dto.SchoolClassResponse;
import com.mems.dto.SchoolClassUpdateRequest;
import com.mems.dto.StudentResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.SchoolClassRepository;
import com.mems.repository.StudentRepository;
import com.mems.repository.TeacherRepository;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
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
    private final TeacherRepository teacherRepository;
    private final ClassStatusService classStatusService;
    private final String teacherAssignmentModuleCode;

    public SchoolClassService(SchoolClassRepository repository, StudentRepository studentRepository,
                              Actor actor, OrganizationModuleGuard moduleGuard, PeopleAuditService audit,
                              TeacherRepository teacherRepository, ClassStatusService classStatusService,
                              @Value("${TEACHER_ASSIGNMENT_MODULE_CODE:TEACHER_ASSIGNMENT}")
                              String teacherAssignmentModuleCode) {
        this.repository = repository;
        this.studentRepository = studentRepository;
        this.actor = actor;
        this.moduleGuard = moduleGuard;
        this.audit = audit;
        this.teacherRepository = teacherRepository;
        this.classStatusService = classStatusService;
        this.teacherAssignmentModuleCode = teacherAssignmentModuleCode;
    }

    @Transactional
    public Map<String, Object> list(int page, int size, String q, String status, boolean selectable) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");
        classStatusService.refreshOrganization(orgId);
        return repository.list(orgId, page, size, q, status, selectable);
    }

    @Transactional
    public SchoolClassResponse get(String id) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");
        classStatusService.refreshOrganization(orgId);
        return repository.require(id, orgId, false);
    }

    @Transactional
    public SchoolClassResponse create(SchoolClassRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");
        validateDates(request.startDate(), request.endDate());

        repository.checkClassCodeAvailable(orgId, request.classCode().trim());

        String id = UUID.randomUUID().toString();
        SchoolClassResponse created = repository.create(
            id, orgId, request.classCode().trim(), request.name().trim(),
            request.academicYear() != null ? request.academicYear().trim() : null,
            request.startDate(), request.endDate(), null, actor.userId()
        );

        audit.record(orgId, actor.userId(), "CLASS_CREATED", id, created);
        return created;
    }

    @Transactional
    public SchoolClassResponse update(String id, SchoolClassUpdateRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");
        classStatusService.refreshOrganization(orgId);

        SchoolClassResponse before = repository.require(id, orgId, true);
        ensureEditable(before);
        validateDates(request.startDate(), request.endDate());

        int updated = repository.update(
            id, orgId, request.name().trim(),
            request.academicYear() != null ? request.academicYear().trim() : null,
            request.startDate(), request.endDate(), request.version()
        );
        if (updated == 0) {
            throw new AppException(ErrorCode.STATUS_CHANGED);
        }

        SchoolClassResponse after = repository.require(id, orgId, false);
        audit.record(orgId, actor.userId(), "CLASS_UPDATED", id, Map.of("before", before, "after", after));
        return after;
    }

    @Transactional
    public void delete(String id) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");

        SchoolClassResponse before = repository.require(id, orgId, true);
        repository.delete(id, orgId);

        audit.record(orgId, actor.userId(), "CLASS_DELETED", id, before);
    }

    @Transactional
    public SchoolClassResponse assignTeacher(String classId, ClassTeacherAssignRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");
        classStatusService.refreshOrganization(orgId);

        SchoolClassResponse before = repository.require(classId, orgId, true);
        if ("DA_KET_THUC".equals(before.status()) || "DA_HUY".equals(before.status())
                || "CLOSED".equals(before.closeState())) {
            throw new AppException(ErrorCode.CLASS_NOT_ASSIGNABLE);
        }

        var teacher = teacherRepository.requireTeacher(request.teacherId(), orgId, false);
        if (!"DANG_DAY".equals(teacher.teachingStatus())
                || !teacherRepository.hasTeacherPosition(teacher.userId(), orgId)) {
            throw new AppException(ErrorCode.TEACHER_NOT_AVAILABLE);
        }

        if (moduleGuard.isActive(orgId, teacherAssignmentModuleCode)) {
            throw new AppException(ErrorCode.TEACHER_ASSIGNMENT_MODULE_ACTIVE);
        }

        int updated = repository.assignTeacher(classId, orgId, teacher.userId(), request.version());
        if (updated == 0) {
            throw new AppException(ErrorCode.DATA_CHANGED);
        }

        SchoolClassResponse after = repository.require(classId, orgId, false);
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("before", before.teacher());
        details.put("after", after.teacher());
        audit.record(orgId, actor.userId(), "CLASS_TEACHER_ASSIGNED", classId, details);
        return after;
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
        classStatusService.refreshOrganization(orgId);

        SchoolClassResponse schoolClass = repository.require(classId, orgId, true);
        ensureEditable(schoolClass);
        studentRepository.require(studentId, orgId, true);

        repository.enrollStudent(classId, studentId, orgId);

        audit.record(orgId, actor.userId(), "CLASS_STUDENT_ADDED", classId,
            Map.of("classId", classId, "studentId", studentId));
    }

    @Transactional
    public void removeStudent(String classId, String studentId) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");
        classStatusService.refreshOrganization(orgId);

        SchoolClassResponse schoolClass = repository.require(classId, orgId, true);
        ensureEditable(schoolClass);
        studentRepository.require(studentId, orgId, false);

        repository.removeStudent(classId, studentId, orgId);

        audit.record(orgId, actor.userId(), "CLASS_STUDENT_REMOVED", classId,
            Map.of("classId", classId, "studentId", studentId));
    }

    private void ensureEditable(SchoolClassResponse schoolClass) {
        if ("DA_KET_THUC".equals(schoolClass.status()) || "DA_HUY".equals(schoolClass.status())
                || "CLOSED".equals(schoolClass.closeState())) {
            throw new AppException(ErrorCode.CLASS_NOT_EDITABLE);
        }
    }

    private void validateDates(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                "endDate: must not be before startDate");
        }
    }
}

