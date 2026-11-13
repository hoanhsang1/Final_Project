package com.mems.service;

import com.mems.dto.ClassCancelRequest;
import com.mems.dto.ClassCloseEventResponse;
import com.mems.dto.ClassCloseRejectRequest;
import com.mems.dto.ClassCloseRequest;
import com.mems.dto.ClassReopenRequest;
import com.mems.dto.ClassStatusLogResponse;
import com.mems.dto.SchoolClassResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.ClassStatusRepository;
import com.mems.repository.SchoolClassRepository;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;

@Service
public class ClassStatusService {
    private static final ZoneId CLASS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Set<String> CANCELLABLE = Set.of("CHUA_BAT_DAU", "DANG_DIEN_RA");

    private final ClassStatusRepository repository;
    private final SchoolClassRepository classRepository;
    private final Actor actor;
    private final OrganizationModuleGuard moduleGuard;

    public ClassStatusService(ClassStatusRepository repository, SchoolClassRepository classRepository,
                              Actor actor, OrganizationModuleGuard moduleGuard) {
        this.repository = repository;
        this.classRepository = classRepository;
        this.actor = actor;
        this.moduleGuard = moduleGuard;
    }

    @Scheduled(cron = "0 5 0 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void refreshAllOrganizations() {
        LocalDate today = LocalDate.now(CLASS_ZONE);
        for (String orgId : repository.organizationsWithClasses()) {
            refresh(orgId, today);
        }
    }

    @Transactional
    public void refreshOrganization(String orgId) {
        refresh(orgId, LocalDate.now(CLASS_ZONE));
    }

    private void refresh(String orgId, LocalDate today) {
        for (ClassStatusRepository.TransitionRow row : repository.dueToStart(orgId, today)) {
            if (repository.transition(row.id(), orgId, "CHUA_BAT_DAU", "DANG_DIEN_RA") > 0) {
                repository.insertStatusLog(row.id(), orgId, "CHUA_BAT_DAU", "DANG_DIEN_RA",
                    "AUTO_START", null);
            }
        }
        for (ClassStatusRepository.TransitionRow row : repository.dueToEnd(orgId, today)) {
            if (repository.transition(row.id(), orgId, "DANG_DIEN_RA", "DA_KET_THUC") > 0) {
                repository.insertStatusLog(row.id(), orgId, "DANG_DIEN_RA", "DA_KET_THUC",
                    "AUTO_END", null);
            }
        }
    }

    @Transactional
    public SchoolClassResponse cancel(String classId, ClassCancelRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");
        refreshOrganization(orgId);

        SchoolClassResponse before = classRepository.require(classId, orgId, true);
        if (!CANCELLABLE.contains(before.status()) || !"NONE".equals(before.closeState())) {
            throw new AppException(ErrorCode.CLASS_NOT_CANCELLABLE);
        }
        if (before.version() != request.version()) {
            throw statusChanged();
        }

        String reason = requireReason(request.reason(), "reason");
        int updated = repository.cancel(classId, orgId, request.version());
        if (updated == 0) {
            throw statusChanged();
        }
        repository.insertStatusLog(classId, orgId, before.status(), "DA_HUY", reason, actor.userId());
        return classRepository.require(classId, orgId, false);
    }

    @Transactional(readOnly = true)
    public List<ClassStatusLogResponse> statusLogs(String classId) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");
        classRepository.require(classId, orgId, false);
        return repository.statusLogs(classId, orgId);
    }

    @Transactional
    public SchoolClassResponse requestClose(String classId, ClassCloseRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");
        refreshOrganization(orgId);

        SchoolClassResponse before = classRepository.require(classId, orgId, true);
        if ("DA_HUY".equals(before.status())) {
            throw new AppException(ErrorCode.CLASS_NOT_CLOSABLE);
        }
        if (!"NONE".equals(before.closeState())) {
            throw closeStateChanged();
        }

        String note = request.note() == null || request.note().isBlank() ? null : request.note().trim();
        if (repository.requestClose(classId, orgId) == 0) {
            throw closeStateChanged();
        }
        repository.insertCloseEvent(classId, orgId, "REQUESTED", actor.userId(), note);
        return classRepository.require(classId, orgId, false);
    }

    @Transactional
    public SchoolClassResponse approveClose(String classId) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");
        refreshOrganization(orgId);

        SchoolClassResponse before = classRepository.require(classId, orgId, true);
        if (!"PENDING".equals(before.closeState())) {
            throw closeStateChanged();
        }
        if (actor.userId().equals(repository.lastRequester(classId, orgId))) {
            throw new AppException(ErrorCode.SELF_APPROVAL_NOT_ALLOWED);
        }
        if (repository.approveClose(classId, orgId) == 0) {
            throw closeStateChanged();
        }
        repository.insertCloseEvent(classId, orgId, "APPROVED", actor.userId(), null);
        return classRepository.require(classId, orgId, false);
    }

    @Transactional
    public SchoolClassResponse rejectClose(String classId, ClassCloseRejectRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");
        refreshOrganization(orgId);

        SchoolClassResponse before = classRepository.require(classId, orgId, true);
        if (!"PENDING".equals(before.closeState())) {
            throw closeStateChanged();
        }
        String reason = requireReason(request.reason(), "reason");
        if (repository.rejectClose(classId, orgId) == 0) {
            throw closeStateChanged();
        }
        repository.insertCloseEvent(classId, orgId, "REJECTED", actor.userId(), reason);
        return classRepository.require(classId, orgId, false);
    }

    @Transactional
    public SchoolClassResponse reopen(String classId, ClassReopenRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");
        refreshOrganization(orgId);

        SchoolClassResponse before = classRepository.require(classId, orgId, true);
        if (!"CLOSED".equals(before.closeState())) {
            throw closeStateChanged();
        }
        String reason = request.reason() == null || request.reason().isBlank() ? null : request.reason().trim();
        if (repository.reopen(classId, orgId) == 0) {
            throw closeStateChanged();
        }
        repository.insertCloseEvent(classId, orgId, "REOPENED", actor.userId(), reason);
        return classRepository.require(classId, orgId, false);
    }

    @Transactional(readOnly = true)
    public List<ClassCloseEventResponse> closeEvents(String classId) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");
        classRepository.require(classId, orgId, false);
        return repository.closeEvents(classId, orgId);
    }

    private String requireReason(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, field + ": must not be blank");
        }
        return value.trim();
    }

    private AppException statusChanged() {
        return new AppException(ErrorCode.STATUS_CHANGED);
    }

    private AppException closeStateChanged() {
        return new AppException(ErrorCode.CLOSE_STATE_CHANGED);
    }
}
