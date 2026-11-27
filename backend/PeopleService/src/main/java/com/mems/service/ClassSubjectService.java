package com.mems.service;

import com.mems.dto.*;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.ClassSubjectRepository;
import com.mems.repository.CurriculumRepository;
import com.mems.repository.SchoolClassRepository;
import com.mems.repository.SubjectRepository;
import com.mems.repository.TeacherRepository;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ClassSubjectService {

    private static final String MODULE = "STUDENT_MANAGEMENT";
    // States that allow subject management
    private static final Set<String> MODIFIABLE_STATES = Set.of("CHUA_BAT_DAU");
    private static final String TEACHER_NOT_ELIGIBLE_MESSAGE =
        "Giáo viên không đủ điều kiện dạy môn này: cần chuyên môn cùng danh mục môn học "
            + "hoặc ngoại lệ được duyệt, và đang ở trạng thái Đang dạy";

    private final ClassSubjectRepository repo;
    private final SchoolClassRepository classRepo;
    private final SubjectRepository subjectRepo;
    private final CurriculumRepository curriculumRepo;
    private final TeacherRepository teacherRepo;
    private final Actor actor;
    private final OrganizationModuleGuard moduleGuard;
    private final PeopleAuditService audit;

    public ClassSubjectService(ClassSubjectRepository repo, SchoolClassRepository classRepo,
                               SubjectRepository subjectRepo, CurriculumRepository curriculumRepo,
                               TeacherRepository teacherRepo, Actor actor,
                               OrganizationModuleGuard moduleGuard, PeopleAuditService audit) {
        this.repo = repo;
        this.classRepo = classRepo;
        this.subjectRepo = subjectRepo;
        this.curriculumRepo = curriculumRepo;
        this.teacherRepo = teacherRepo;
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
        requireEligibleTeacher(orgId, request.teacherId(), request.subjectId());

        // D8/D9: nhập tay mặc định 2 buổi/tuần, giai đoạn 1.
        int sessionsPerWeek = request.sessionsPerWeek() != null ? request.sessionsPerWeek() : 2;
        int stageNo = request.stageNo() != null ? request.stageNo() : 1;
        ClassSubjectResponse result = repo.addSubject(classId, request.subjectId(),
            request.plannedSessions(), request.sessionMinutes(), sessionsPerWeek, stageNo,
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
        requireEligibleTeacher(orgId, request.teacherId(), subjectId);

        ClassSubjectResponse result = repo.updateSubject(classId, subjectId,
            request.plannedSessions(), request.sessionMinutes(),
            request.sessionsPerWeek(), request.stageNo(), request.teacherId());
        audit.record(orgId, actor.userId(), "CLASS_SUBJECT_UPDATED", classId, result);
        return result;
    }

    /**
     * Áp chương trình đào tạo: đặt school_class.curriculum_id rồi sao chép các môn còn thiếu
     * sang class_subject (source=CURRICULUM). Không xoá/ghi đè môn MANUAL; môn đã có giữ nguyên.
     */
    @Transactional
    public ClassSubjectListResponse applyCurriculum(String classId, ApplyCurriculumRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, MODULE);
        SchoolClassResponse cls = classRepo.require(classId, orgId, false);
        checkModifiable(cls);
        if (cls.version() != request.version().longValue())
            throw new AppException(ErrorCode.VERSION_MISMATCH);

        curriculumRepo.require(request.curriculumId(), orgId);
        List<CurriculumSubjectResponse> subjects = curriculumRepo.listSubjects(request.curriculumId());
        validateStageOrder(subjects, curriculumRepo.prerequisiteEdges(request.curriculumId()));

        int updated = classRepo.setCurriculum(classId, orgId, request.curriculumId(), request.version());
        if (updated == 0) throw new AppException(ErrorCode.VERSION_MISMATCH);

        int added = repo.applyCurriculum(classId, request.curriculumId(), subjects);
        audit.record(orgId, actor.userId(), "CLASS_CURRICULUM_APPLIED", classId,
            Map.of("curriculumId", request.curriculumId(), "added", added));
        return repo.list(classId);
    }

    @Transactional
    public void removeSubject(String classId, String subjectId) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, MODULE);
        SchoolClassResponse cls = classRepo.require(classId, orgId, false);
        checkModifiable(cls);

        // TODO(P5): chặn xoá khi môn còn buổi học tương lai chưa hủy. People chưa có client
        // gọi Schedule và Schedule chưa mở API tra buổi theo (classId, subjectId) — bổ sung
        // ở prompt sau, không tự tạo phụ thuộc chéo ở đây.
        repo.removeSubject(classId, subjectId);
        audit.record(orgId, actor.userId(), "CLASS_SUBJECT_REMOVED", classId,
            Map.of("subjectId", subjectId));
    }

    /** Môn phải ở giai đoạn sau mọi môn tiên quyết của nó (stage_no > stage của tiên quyết). */
    private void validateStageOrder(List<CurriculumSubjectResponse> subjects,
                                    Map<String, List<String>> prerequisites) {
        Map<String, Integer> stages = new HashMap<>();
        subjects.forEach(s -> stages.put(s.subjectId(), s.sequenceNo()));
        for (CurriculumSubjectResponse subject : subjects) {
            for (String prereqId : prerequisites.getOrDefault(subject.subjectId(), List.of())) {
                Integer prereqStage = stages.get(prereqId);
                if (prereqStage != null && subject.sequenceNo() <= prereqStage) {
                    throw new AppException(ErrorCode.PREREQUISITE_STAGE_INVALID,
                        "Môn " + subject.subjectName() + " phải ở giai đoạn sau môn tiên quyết");
                }
            }
        }
    }

    private void checkModifiable(SchoolClassResponse cls) {
        if (!MODIFIABLE_STATES.contains(cls.status())) {
            throw new AppException(ErrorCode.CLASS_NOT_MODIFIABLE,
                "Chỉ có thể thay đổi môn học khi lớp ở trạng thái Chưa bắt đầu");
        }
    }

    /** Giáo viên được gán cho môn phải đang dạy và đủ điều kiện theo D1; null = bỏ gán. */
    private void requireEligibleTeacher(String orgId, String teacherId, String subjectId) {
        if (teacherId == null || teacherId.isBlank()) return;
        String id = teacherId.trim();
        teacherRepo.requireTeacher(id, orgId, false);
        if (!teacherRepo.teachesSubject(id, orgId, subjectId)) {
            throw new AppException(ErrorCode.SUBJECT_MISMATCH, TEACHER_NOT_ELIGIBLE_MESSAGE);
        }
    }
}
