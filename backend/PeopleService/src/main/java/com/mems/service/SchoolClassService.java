package com.mems.service;

import com.mems.dto.ApplyCurriculumRequest;
import com.mems.dto.ClassTeacherAssignRequest;
import com.mems.dto.SchoolClassRequest;
import com.mems.dto.SchoolClassResponse;
import com.mems.dto.SchoolClassUpdateRequest;
import com.mems.dto.StudentResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.outbox.OutboxEventRepository;
import com.mems.outbox.OutboxEventTypes;
import com.mems.repository.SchoolClassRepository;
import com.mems.repository.StudentRepository;
import com.mems.repository.SubjectRepository;
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
import java.util.Objects;
import java.util.Set;
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
    private final SubjectRepository subjectRepository;
    private final ClassSubjectService classSubjectService;
    private final OutboxEventRepository outbox;
    private final String teacherAssignmentModuleCode;

    public SchoolClassService(SchoolClassRepository repository, StudentRepository studentRepository,
                              Actor actor, OrganizationModuleGuard moduleGuard, PeopleAuditService audit,
                              TeacherRepository teacherRepository, ClassStatusService classStatusService,
                              SubjectRepository subjectRepository, ClassSubjectService classSubjectService,
                              OutboxEventRepository outbox,
                              @Value("${TEACHER_ASSIGNMENT_MODULE_CODE:TEACHER_ASSIGNMENT}")
                              String teacherAssignmentModuleCode) {
        this.repository = repository;
        this.studentRepository = studentRepository;
        this.actor = actor;
        this.moduleGuard = moduleGuard;
        this.audit = audit;
        this.teacherRepository = teacherRepository;
        this.classStatusService = classStatusService;
        this.subjectRepository = subjectRepository;
        this.classSubjectService = classSubjectService;
        this.outbox = outbox;
        this.teacherAssignmentModuleCode = teacherAssignmentModuleCode;
    }

    @Transactional
    public Map<String, Object> list(int page, int size, String q, String status, boolean selectable) {
        return list(page, size, q, status, selectable, null);
    }

    @Transactional
    public Map<String, Object> list(int page, int size, String q, String status, boolean selectable,
                                    Boolean needsReassignment) {
        String orgId = actor.orgId();
        moduleGuard.requireModuleReadable(orgId, "STUDENT_MANAGEMENT");
        classStatusService.refreshOrganization(orgId);
        return repository.list(orgId, page, size, q, status, selectable, needsReassignment,
            null, classViewDepartments());
    }

    /** Lớp được phân công cho chính giáo viên đang đăng nhập. */
    @Transactional
    public Map<String, Object> myClasses(int page, int size, String q, String status, boolean selectable) {
        String orgId = actor.orgId();
        moduleGuard.requireModuleReadable(orgId, "STUDENT_MANAGEMENT");
        teacherRepository.requireTeacher(actor.userId(), orgId, false);
        classStatusService.refreshOrganization(orgId);
        return repository.list(orgId, page, size, q, status, selectable, null,
            actor.userId(), null);
    }

    @Transactional
    public SchoolClassResponse get(String id) {
        String orgId = actor.orgId();
        moduleGuard.requireModuleReadable(orgId, "STUDENT_MANAGEMENT");
        classStatusService.refreshOrganization(orgId);
        SchoolClassResponse schoolClass = repository.require(id, orgId, false);
        requireClassInScope(orgId, schoolClass);
        return schoolClass;
    }

    @Transactional
    public SchoolClassResponse create(SchoolClassRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");
        validateDates(request.startDate(), request.endDate());

        repository.checkClassCodeAvailable(orgId, request.classCode().trim());
        var subject = subjectRepository.nullableActive(request.subjectId(), orgId);

        String id = UUID.randomUUID().toString();
        SchoolClassResponse created = repository.create(
            id, orgId, request.classCode().trim(), request.name().trim(),
            request.academicYear() != null ? request.academicYear().trim() : null,
            subject == null ? null : subject.id(),
            request.startDate(), request.endDate(), null, actor.userId()
        );

        audit.record(orgId, actor.userId(), "CLASS_CREATED", id, created);

        if (request.curriculumId() != null && !request.curriculumId().isBlank()) {
            // Cùng một transaction: chương trình lỗi thì không lớp nào được lưu lại.
            classSubjectService.applyCurriculum(id, new ApplyCurriculumRequest(
                request.curriculumId().trim(), Math.toIntExact(created.version()), null, null));
            return repository.require(id, orgId, false);
        }
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
        var subject = subjectRepository.nullableActive(request.subjectId(), orgId);

        int updated = repository.update(
            id, orgId, request.name().trim(),
            request.academicYear() != null ? request.academicYear().trim() : null,
            subject == null ? null : subject.id(),
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
        return assignTeacher(classId, request, false);
    }

    /** Gán lại giáo viên cho lớp đang gắn nhãn "cần phân công lại" (quy tắc 17). */
    @Transactional
    public SchoolClassResponse reassignTeacher(String classId, ClassTeacherAssignRequest request) {
        return assignTeacher(classId, request, true);
    }

    private SchoolClassResponse assignTeacher(String classId, ClassTeacherAssignRequest request,
                                              boolean reassign) {
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

        // Lớp cũ chưa có môn học thì bỏ qua kiểm tra để không chặn dữ liệu legacy.
        if (before.subjectId() != null
                && !teacherRepository.teachesSubject(teacher.userId(), orgId, before.subjectId())) {
            throw new AppException(ErrorCode.SUBJECT_MISMATCH);
        }

        if (moduleGuard.isActive(orgId, teacherAssignmentModuleCode)) {
            throw new AppException(ErrorCode.TEACHER_ASSIGNMENT_MODULE_ACTIVE);
        }

        int updated = repository.assignTeacher(classId, orgId, teacher.userId(), request.version());
        if (updated == 0) {
            throw new AppException(ErrorCode.DATA_CHANGED);
        }

        SchoolClassResponse after = repository.require(classId, orgId, false);
        publishTeacherChanged(orgId, before, after);
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("before", before.teacher());
        details.put("after", after.teacher());
        details.put("needsReassignmentCleared", before.needsReassignment());
        audit.record(orgId, actor.userId(),
            reassign ? "CLASS_TEACHER_REASSIGNED" : "CLASS_TEACHER_ASSIGNED", classId, details);
        return after;
    }

    /** SCH-01: event chỉ báo thay đổi, Schedule quyết định đánh dấu buổi bị ảnh hưởng. */
    private void publishTeacherChanged(String orgId, SchoolClassResponse before,
                                       SchoolClassResponse after) {
        String previousId = before.teacher() == null ? null : before.teacher().id();
        String newId = after.teacher() == null ? null : after.teacher().id();
        if (Objects.equals(previousId, newId)) return;
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("classId", after.id());
        payload.put("classCode", after.classCode());
        payload.put("previousTeacherId", previousId);
        payload.put("newTeacherId", newId);
        payload.put("classVersion", after.version());
        outbox.append(orgId, "CLASS", after.id(), after.version(),
            OutboxEventTypes.CLASS_TEACHER_CHANGED, 1, UUID.randomUUID().toString(), payload);
    }

    @Transactional(readOnly = true)
    public List<StudentResponse> listStudents(String classId) {        String orgId = actor.orgId();
        moduleGuard.requireModuleReadable(orgId, "STUDENT_MANAGEMENT");
        SchoolClassResponse schoolClass = repository.require(classId, orgId, false);
        requireClassInScope(orgId, schoolClass);
        return studentRepository.findByClassId(classId, orgId);
    }

    /** Học sinh trong lớp do chính giáo viên đang đăng nhập phụ trách. */
    @Transactional(readOnly = true)
    public List<StudentResponse> myClassStudents(String classId) {
        String orgId = actor.orgId();
        moduleGuard.requireModuleReadable(orgId, "STUDENT_MANAGEMENT");
        teacherRepository.requireTeacher(actor.userId(), orgId, false);
        SchoolClassResponse schoolClass = repository.require(classId, orgId, false);
        String teacherId = schoolClass.teacher() == null ? null : schoolClass.teacher().id();
        if (!actor.userId().equals(teacherId)) {
            throw actor.forbidden("Class is not assigned to you");
        }
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

    /** null = xem toàn tổ chức; ngược lại chỉ các phòng ban này. */
    private Set<String> classViewDepartments() {
        if (actor.owner() || actor.hasOrganizationScope("class.view")) return null;
        Set<String> departments = actor.departmentScopes("class.view");
        if (departments.isEmpty()) throw actor.forbidden("Missing permission in scope: class.view");
        return departments;
    }

    private void requireClassInScope(String orgId, SchoolClassResponse schoolClass) {
        if (actor.owner() || actor.hasOrganizationScope("class.view")) return;
        Set<String> departments = actor.departmentScopes("class.view");
        if (!repository.inDepartments(orgId, schoolClass.id(), departments)) {
            throw actor.forbidden("Class is outside your department scope");
        }
    }
}

