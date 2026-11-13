package com.mems.service;

import com.mems.dto.*;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.exception.SpecialtyMismatchException;
import com.mems.repository.*;
import com.mems.security.Actor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class TeacherService {
    private final MemberService members;
    private final TeacherRepository teachers;
    private final StaffProfileRepository staff;
    private final SpecialtyRepository specialties;
    private final SpecialtyService specialtyService;
    private final PositionRepository positions;
    private final MemberRepository memberRepository;
    private final PeopleAuditService audit;
    private final Actor actor;

    public TeacherService(MemberService members, TeacherRepository teachers, StaffProfileRepository staff,
                          SpecialtyRepository specialties, SpecialtyService specialtyService,
                          PositionRepository positions, MemberRepository memberRepository,
                          PeopleAuditService audit, Actor actor) {
        this.members = members;
        this.teachers = teachers;
        this.staff = staff;
        this.specialties = specialties;
        this.specialtyService = specialtyService;
        this.positions = positions;
        this.memberRepository = memberRepository;
        this.audit = audit;
        this.actor = actor;
    }

    public CreatedTeacherResponse create(TeacherCreateRequest request) {
        String orgId = actor.orgId();
        if (!positions.profileTypes(orgId, request.positionIds()).contains("TEACHER")) {
            throw new AppException(ErrorCode.INVALID_POSITION,
                "positionIds: at least one TEACHER position is required");
        }
        MemberRequest member = new MemberRequest(request.username(), request.email(), request.role(),
            request.positionIds(), request.staffCode(), request.fullName(), request.phone(),
            request.teacherProfile());
        var created = members.create(request.departmentId(), member);
        var saved = staff.find(created.member().userId(), orgId).orElseThrow();
        return new CreatedTeacherResponse(saved.userId(), saved.staffCode(), saved.fullName(),
            created.temporaryPassword(), true);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> list(int page, int size, String q, String specialtyId, String teachingStatus) {
        String orgId = actor.orgId();
        String departmentId = null;
        if (!actor.owner()) {
            departmentId = actor.departmentIdOrNull();
            if (departmentId == null || departmentId.isBlank()) {
                throw actor.forbidden("Department access denied");
            }
        }
        return teachers.list(orgId, departmentId, q, specialtyId, teachingStatus, page, size);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> assignable(String q, int page, int size) {
        return teachers.assignable(actor.orgId(), q, page, size);
    }

    @Transactional(readOnly = true)
    public TeacherDetailResponse get(String userId) {
        String orgId = actor.orgId();
        var row = teachers.requireTeacher(userId, orgId, false);
        actor.requireDepartment(row.departmentId());
        return detail(row);
    }

    @Transactional
    public TeacherDetailResponse update(String userId, TeacherUpdateRequest request) {
        String orgId = actor.orgId(), actorId = actor.userId();
        var row = teachers.requireTeacher(userId, orgId, true);
        actor.requireDepartment(row.departmentId());
        specialtyService.validateIds(orgId, request.specialtyIds());

        String fullName = request.fullName().trim();
        String phone = request.phone() == null ? row.phone() : trimToNull(request.phone());
        String email = request.email() == null ? row.email() : normalizeEmail(request.email());
        if (email != null && staff.existsEmail(orgId, email, userId)) {
            throw new AppException(ErrorCode.EMAIL_EXISTS);
        }

        Set<String> current = specialties.forUser(userId, orgId).stream()
            .map(SpecialtyResponse::id).collect(java.util.stream.Collectors.toCollection(TreeSet::new));
        Set<String> requested = new TreeSet<>(request.specialtyIds());
        boolean specialtiesChanged = !current.equals(requested);
        if (specialtiesChanged) {
            var mismatches = teachers.subjectMismatch(userId, orgId, requested);
            if (!mismatches.isEmpty() && !Boolean.TRUE.equals(request.confirm())) {
                throw new SpecialtyMismatchException(mismatches);
            }
        }

        int updated = staff.updateDetails(userId, orgId, fullName, phone, email, actorId, request.version());
        if (updated == 0) {
            throw new AppException(ErrorCode.DATA_CHANGED, "Teacher profile was changed by another request");
        }
        teachers.updateContract(userId, orgId, request.contractType(), actorId);
        if (specialtiesChanged) {
            teachers.replaceSpecialties(userId, orgId, requested);
        }

        Map<String, Object> changes = new LinkedHashMap<>();
        recordChange(changes, "fullName", row.fullName(), fullName);
        recordChange(changes, "email", row.email(), email);
        recordChange(changes, "phone", row.phone(), phone);
        recordChange(changes, "contractType", row.contractType(), request.contractType());
        if (specialtiesChanged) {
            recordChange(changes, "specialtyIds", new ArrayList<>(current), new ArrayList<>(requested));
        }
        audit.record(orgId, actorId, "TEACHER_UPDATED", userId, changes);

        return detail(teachers.requireTeacher(userId, orgId, false));
    }

    private TeacherDetailResponse detail(TeacherRepository.TeacherRow row) {
        List<TeacherClassResponse> classes = teachers.classes(row.userId(), row.orgId());
        long classCount = classes.stream()
            .filter(c -> "CHUA_BAT_DAU".equals(c.status()) || "DANG_DIEN_RA".equals(c.status()))
            .count();
        return new TeacherDetailResponse(
            row.userId(), row.staffCode(), row.fullName(), row.email(), row.phone(), row.departmentId(),
            memberRepository.positionIds(row.userId(), false),
            specialties.forUser(row.userId(), row.orgId()),
            row.contractType(), row.teachingStatus(), classes,
            row.version(), row.createdAt(), row.updatedAt(),
            teachers.history(row.userId(), row.orgId()),
            classCount, classCount == 0, classCount == 0 ? "Chưa có lớp" : null);
    }

    private void recordChange(Map<String, Object> changes, String field, Object before, Object after) {
        if (Objects.equals(before, after)) return;
        Map<String, Object> diff = new LinkedHashMap<>();
        diff.put("before", before);
        diff.put("after", after);
        changes.put(field, diff);
    }

    private String normalizeEmail(String value) {
        String trimmed = trimToNull(value);
        return trimmed == null ? null : trimmed.toLowerCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
