package com.mems.service;

import com.mems.dto.ClassCancelRequest;
import com.mems.dto.ClassCloseEventResponse;
import com.mems.dto.ClassCloseRejectRequest;
import com.mems.dto.ClassCloseRequest;
import com.mems.dto.ClassLifecycleInboxItem;
import com.mems.dto.ClassReopenRequest;
import com.mems.dto.ClassStatusLogResponse;
import com.mems.dto.SchoolClassResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.outbox.OutboxEventRepository;
import com.mems.outbox.OutboxEventTypes;
import com.mems.repository.ClassStatusRepository;
import com.mems.repository.SchoolClassRepository;
import com.mems.security.Actor;
import com.mems.security.OrganizationModuleGuard;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class ClassStatusService {
    private static final ZoneId CLASS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Set<String> CANCELLABLE = Set.of("CHUA_BAT_DAU", "DANG_DIEN_RA");

    private final ClassStatusRepository repository;
    private final SchoolClassRepository classRepository;
    private final Actor actor;
    private final OrganizationModuleGuard moduleGuard;
    private final ClassApprovalPolicy approvalPolicy;
    private final NotificationService notifications;
    private final OutboxEventRepository outbox;

    @Autowired
    public ClassStatusService(ClassStatusRepository repository, SchoolClassRepository classRepository,
                              Actor actor, OrganizationModuleGuard moduleGuard,
                              ClassApprovalPolicy approvalPolicy, NotificationService notifications,
                              OutboxEventRepository outbox) {
        this.repository = repository;
        this.classRepository = classRepository;
        this.actor = actor;
        this.moduleGuard = moduleGuard;
        this.approvalPolicy = approvalPolicy;
        this.notifications = notifications;
        this.outbox = outbox;
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
                publishRefresh(orgId, row, "DANG_DIEN_RA", "AUTO_START");
            }
        }
        for (ClassStatusRepository.TransitionRow row : repository.dueToEnd(orgId, today)) {
            if (repository.transition(row.id(), orgId, "DANG_DIEN_RA", "DA_KET_THUC") > 0) {
                repository.insertStatusLog(row.id(), orgId, "DANG_DIEN_RA", "DA_KET_THUC",
                    "AUTO_END", null);
                publishRefresh(orgId, row, "DA_KET_THUC", "AUTO_END");
            }
        }
    }

    @Transactional
    public SchoolClassResponse cancel(String classId, ClassCancelRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");
        refreshOrganization(orgId);

        SchoolClassResponse before = classRepository.require(classId, orgId, true);
        if (!CANCELLABLE.contains(before.status()) || !"NONE".equals(before.closeState())
                || !"NONE".equals(before.cancelState())) {
            throw new AppException(ErrorCode.CLASS_NOT_CANCELLABLE);
        }
        if (before.version() != request.version()) {
            throw statusChanged();
        }

        String reason = requireReason(request.reason(), "reason");
        if (before.studentCount() > 0) {
            if (repository.requestCancel(classId, orgId, reason, request.version(), actor.userId()) == 0) {
                throw statusChanged();
            }
            repository.insertCloseEvent(classId, orgId, "CANCEL_REQUESTED", actor.userId(), reason);
            notifyManagers(orgId, classId, "CLASS_CANCEL_APPROVAL", "Yêu cầu hủy lớp cần duyệt",
                "Lớp " + before.classCode() + " còn " + before.studentCount()
                    + " học sinh nên cần trưởng phòng duyệt hủy. Lý do: " + reason);
            SchoolClassResponse requested = classRepository.require(classId, orgId, false);
            publishAfterChange(orgId, before, requested, reason);
            return requested;
        }

        int updated = repository.cancel(classId, orgId, request.version());
        if (updated == 0) {
            throw statusChanged();
        }
        repository.insertStatusLog(classId, orgId, before.status(), "DA_HUY", reason, actor.userId());
        SchoolClassResponse cancelled = classRepository.require(classId, orgId, false);
        publishAfterChange(orgId, before, cancelled, reason);
        return cancelled;
    }

    /** Duyệt hủy lớp có học sinh (quy tắc 14). */
    @Transactional
    public SchoolClassResponse approveCancel(String classId) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");
        refreshOrganization(orgId);

        SchoolClassResponse before = classRepository.require(classId, orgId, true);
        requirePendingCancel(before);
        String requesterId = repository.cancelRequester(classId, orgId);
        requireDecisionAllowed(orgId, requesterId);
        String reason = before.cancelRequestReason();
        if (repository.approveCancel(classId, orgId) == 0) {
            throw new AppException(ErrorCode.CANCEL_STATE_CHANGED);
        }
        repository.insertStatusLog(classId, orgId, before.status(), "DA_HUY", reason, actor.userId());
        repository.insertCloseEvent(classId, orgId, "CANCEL_APPROVED", actor.userId(), reason);
        notifyRequester(orgId, classId, requesterId, "CLASS_CANCEL_APPROVAL",
            "Yêu cầu hủy lớp đã được duyệt", "Lớp " + before.classCode() + " đã bị hủy.");
        SchoolClassResponse approved = classRepository.require(classId, orgId, false);
        publishAfterChange(orgId, before, approved, reason);
        return approved;
    }

    @Transactional
    public SchoolClassResponse rejectCancel(String classId, ClassCloseRejectRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");
        refreshOrganization(orgId);

        SchoolClassResponse before = classRepository.require(classId, orgId, true);
        requirePendingCancel(before);
        String requesterId = repository.cancelRequester(classId, orgId);
        requireDecisionAllowed(orgId, requesterId);
        String reason = requireReason(request.reason(), "reason");
        if (repository.rejectCancel(classId, orgId) == 0) {
            throw new AppException(ErrorCode.CANCEL_STATE_CHANGED);
        }
        repository.insertCloseEvent(classId, orgId, "CANCEL_REJECTED", actor.userId(), reason);
        notifyRequester(orgId, classId, requesterId, "CLASS_CANCEL_APPROVAL",
            "Yêu cầu hủy lớp bị từ chối",
            "Lớp " + before.classCode() + " tiếp tục hoạt động. Lý do: " + reason);
        SchoolClassResponse rejected = classRepository.require(classId, orgId, false);
        publishAfterChange(orgId, before, rejected, reason);
        return rejected;
    }

    @Transactional(readOnly = true)
    public List<ClassStatusLogResponse> statusLogs(String classId) {
        String orgId = actor.orgId();
        moduleGuard.requireModuleReadable(orgId, "STUDENT_MANAGEMENT");
        requireViewScope(orgId, classRepository.require(classId, orgId, false));
        return repository.statusLogs(classId, orgId);
    }

    /**
     * Hộp duyệt vòng đời lớp: các yêu cầu đóng/hủy đang chờ mà người gọi có
     * thẩm quyền quyết định (quy tắc 14). Chỉ cần module đọc được — không phụ
     * thuộc quyền xem danh sách nhân sự/phòng ban. Module chưa đăng ký thì trả
     * rỗng để không làm hỏng hộp duyệt hợp nhất.
     */
    @Transactional(readOnly = true)
    public List<ClassLifecycleInboxItem> approvalInbox() {
        String orgId = actor.orgId();
        if (approvalPolicy == null || !moduleGuard.isReadable(orgId, "STUDENT_MANAGEMENT")) {
            return List.of();
        }
        return classRepository.pendingLifecycle(orgId).stream()
            .filter(item -> approvalPolicy.canApprove(orgId, item.requesterId()))
            .toList();
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
        if (repository.requestClose(classId, orgId, actor.userId()) == 0) {
            throw closeStateChanged();
        }
        repository.insertCloseEvent(classId, orgId, "REQUESTED", actor.userId(), note);
        notifyManagers(orgId, classId, "CLASS_CLOSE_APPROVAL", "Yêu cầu đóng lớp cần duyệt",
            "Lớp " + before.classCode() + " yêu cầu đóng."
                + (note == null ? "" : " Ghi chú: " + note));
        SchoolClassResponse requested = classRepository.require(classId, orgId, false);
        publishAfterChange(orgId, before, requested, note);
        return requested;
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
        String requesterId = repository.closeRequester(classId, orgId);
        requireDecisionAllowed(orgId, requesterId);
        if (repository.approveClose(classId, orgId) == 0) {
            throw closeStateChanged();
        }
        repository.insertCloseEvent(classId, orgId, "APPROVED", actor.userId(), null);
        notifyRequester(orgId, classId, requesterId, "CLASS_CLOSE_APPROVAL",
            "Yêu cầu đóng lớp đã được duyệt", "Lớp " + before.classCode() + " đã đóng.");
        SchoolClassResponse approved = classRepository.require(classId, orgId, false);
        publishAfterChange(orgId, before, approved, null);
        return approved;
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
        String requesterId = repository.closeRequester(classId, orgId);
        requireDecisionAllowed(orgId, requesterId);
        String reason = requireReason(request.reason(), "reason");
        if (repository.rejectClose(classId, orgId) == 0) {
            throw closeStateChanged();
        }
        repository.insertCloseEvent(classId, orgId, "REJECTED", actor.userId(), reason);
        notifyRequester(orgId, classId, requesterId, "CLASS_CLOSE_APPROVAL",
            "Yêu cầu đóng lớp bị từ chối",
            "Lớp " + before.classCode() + " tiếp tục hoạt động. Lý do: " + reason);
        SchoolClassResponse rejected = classRepository.require(classId, orgId, false);
        publishAfterChange(orgId, before, rejected, reason);
        return rejected;
    }

    @Transactional
    public SchoolClassResponse reopen(String classId, ClassReopenRequest request) {
        String orgId = actor.orgId();
        moduleGuard.requireModule(orgId, "STUDENT_MANAGEMENT");
        refreshOrganization(orgId);

        SchoolClassResponse before = classRepository.require(classId, orgId, true);
        requirePermissionScope(orgId, before, "class.reopen");
        if (!"CLOSED".equals(before.closeState())) {
            throw closeStateChanged();
        }
        String reason = request.reason() == null || request.reason().isBlank() ? null : request.reason().trim();
        if (repository.reopen(classId, orgId) == 0) {
            throw closeStateChanged();
        }
        repository.insertCloseEvent(classId, orgId, "REOPENED", actor.userId(), reason);
        SchoolClassResponse reopened = classRepository.require(classId, orgId, false);
        publishAfterChange(orgId, before, reopened, reason);
        return reopened;
    }

    @Transactional(readOnly = true)
    public List<ClassCloseEventResponse> closeEvents(String classId) {
        String orgId = actor.orgId();
        moduleGuard.requireModuleReadable(orgId, "STUDENT_MANAGEMENT");
        requireViewScope(orgId, classRepository.require(classId, orgId, false));
        return repository.closeEvents(classId, orgId);
    }

    /** CLS-03: chỉ phát event; Schedule đánh dấu buổi bị ảnh hưởng, không tự hủy. */
    private void publishAfterChange(String orgId, SchoolClassResponse before,
                                    SchoolClassResponse after, String reason) {
        publishStatusChanged(orgId, after.id(), after.classCode(), after.version(),
            before.status(), after.status(), before.closeState(), after.closeState(),
            before.cancelState(), after.cancelState(), reason);
    }

    private void publishRefresh(String orgId, ClassStatusRepository.TransitionRow row,
                                String newStatus, String reason) {
        SchoolClassResponse after = classRepository.require(row.id(), orgId, false);
        publishStatusChanged(orgId, row.id(), row.classCode(), after.version(),
            row.status(), newStatus, after.closeState(), after.closeState(),
            after.cancelState(), after.cancelState(), reason);
    }

    private void publishStatusChanged(String orgId, String classId, String classCode, long version,
                                      String previousStatus, String newStatus,
                                      String previousCloseState, String closeState,
                                      String previousCancelState, String cancelState,
                                      String reason) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("classId", classId);
        payload.put("classCode", classCode);
        payload.put("previousStatus", previousStatus);
        payload.put("newStatus", newStatus);
        payload.put("previousCloseState", previousCloseState);
        payload.put("closeState", closeState);
        payload.put("previousCancelState", previousCancelState);
        payload.put("cancelState", cancelState);
        payload.put("reason", reason);
        payload.put("effectiveAt", Instant.now().toString());
        outbox.append(orgId, "CLASS", classId, version,
            OutboxEventTypes.CLASS_STATUS_CHANGED, 1, UUID.randomUUID().toString(), payload);
    }

    private void requireViewScope(String orgId, SchoolClassResponse schoolClass) {
        requirePermissionScope(orgId, schoolClass, "class.view");
    }

    /** Quyền chỉ ở phạm vi DEPARTMENT thì lớp phải do phòng ban đó phụ trách. */
    private void requirePermissionScope(String orgId, SchoolClassResponse schoolClass, String permission) {
        if (actor.owner() || actor.hasOrganizationScope(permission)) return;
        Set<String> departments = actor.departmentScopes(permission);
        if (!classRepository.inDepartments(orgId, schoolClass.id(), departments)) {
            throw actor.forbidden("Class is outside your department scope");
        }
    }

    private void requirePendingCancel(SchoolClassResponse schoolClass) {
        if (!"PENDING".equals(schoolClass.cancelState())) {
            throw new AppException(ErrorCode.CANCEL_STATE_CHANGED);
        }
    }

    /**
     * A decision on a class lifecycle request is never allowed for its own requester,
     * and the actor must be an eligible approver under the escalation policy.
     */
    private void requireDecisionAllowed(String orgId, String requesterId) {
        if (requesterId != null && requesterId.equals(actor.userId())) {
            throw new AppException(ErrorCode.SELF_APPROVAL_NOT_ALLOWED);
        }
        if (approvalPolicy != null) approvalPolicy.requireApprover(orgId, requesterId);
    }

    private void notifyManagers(String orgId, String classId, String type, String title, String body) {
        if (notifications == null || approvalPolicy == null) return;
        String creator = classRepository.require(classId, orgId, false).createdBy();
        notifications.notifyAll(orgId, approvalPolicy.classManagers(orgId, creator),
            type, title, body, "SCHOOL_CLASS", classId);
    }

    private void notifyRequester(String orgId, String classId, String requesterId,
                                 String type, String title, String body) {
        if (notifications == null) return;
        notifications.notify(orgId, requesterId,
            type, title, body, "SCHOOL_CLASS", classId);
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
