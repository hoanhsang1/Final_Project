package com.mems.service;

import com.mems.dto.*;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.exception.SubjectUsageWarningException;
import com.mems.repository.SubjectRepository;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
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

        String code = normalizeCode(request.code());
        requireUniqueCode(orgId, code, null);
        String categoryId = resolveCategory(orgId, request.categoryId(), null);
        String roomRequirement = normalizeRoomRequirement(request.roomRequirement());

        SubjectResponse created = repository.create(orgId, code, request.name(),
            request.description(), categoryId, roomRequirement, actor.userId());
        audit.record(orgId, actor.userId(), "SUBJECT_CREATED", created.id(), created);
        return created;
    }

    @Transactional
    public SubjectResponse update(String id, SubjectRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, MODULE_STUDENT_MANAGEMENT);

        SubjectResponse before = repository.require(id, orgId);

        String code = normalizeCode(request.code());
        requireUniqueCode(orgId, code, id);
        String categoryId = resolveCategory(orgId, request.categoryId(), before);
        String roomRequirement = normalizeRoomRequirement(request.roomRequirement());

        boolean classificationChanged =
            !Objects.equals(before.categoryId(), categoryId)
                || !Objects.equals(before.roomRequirement(), roomRequirement);
        if (classificationChanged && !Boolean.TRUE.equals(request.confirm())) {
            SubjectUsageResponse usage = repository.getUsage(id, orgId);
            List<ClassMismatch> classes = affectedClasses(usage.classSubjects());
            if (!classes.isEmpty() || !usage.curricula().isEmpty()) {
                throw new SubjectUsageWarningException(classes, usage.curricula());
            }
        }

        SubjectResponse updated = repository.update(id, orgId, code, request.name(),
            request.description(), categoryId, roomRequirement, actor.userId());
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

    private String normalizeCode(String code) {
        if (code == null) return null;
        String trimmed = code.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void requireUniqueCode(String orgId, String code, String excludeId) {
        if (code == null) return;
        Optional<SubjectResponse> existing = repository.findByCode(orgId, code);
        if (existing.isPresent() && !existing.get().id().equals(excludeId)) {
            throw new AppException(ErrorCode.SUBJECT_CODE_EXISTS, "Mã môn học đã tồn tại trong tổ chức");
        }
    }

    /**
     * Category phải cùng tổ chức và đang hoạt động. Khi sửa môn, giữ nguyên category
     * hiện tại (dù đã ngừng) thì không bắt đổi — tránh khoá dữ liệu cũ.
     */
    private String resolveCategory(String orgId, String categoryId, SubjectResponse current) {
        if (categoryId == null || categoryId.isBlank()) return null;
        String trimmed = categoryId.trim();
        if (current != null && trimmed.equals(current.categoryId())) return trimmed;
        if (repository.activeCategoryName(orgId, trimmed) == null) {
            throw new AppException(ErrorCode.SUBJECT_CATEGORY_INVALID);
        }
        return trimmed;
    }

    private String normalizeRoomRequirement(String value) {
        if (value == null || value.isBlank()) return "ANY";
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        if (!normalized.equals("ANY") && !normalized.equals("COMPUTER")) {
            throw new AppException(ErrorCode.ROOM_REQUIREMENT_INVALID);
        }
        return normalized;
    }

    private List<ClassMismatch> affectedClasses(
        List<SubjectUsageResponse.SubjectClassUsageItem> items) {
        Map<String, String> byId = new LinkedHashMap<>();
        for (SubjectUsageResponse.SubjectClassUsageItem item : items) {
            byId.putIfAbsent(item.classId(), item.name());
        }
        return byId.entrySet().stream()
            .map(entry -> new ClassMismatch(entry.getKey(), entry.getValue()))
            .toList();
    }
}
