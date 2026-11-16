package com.mems.service;

import com.mems.dto.MemberResponse;
import com.mems.dto.TransferCreateRequest;
import com.mems.dto.TransferResponse;
import com.mems.dto.TransferStepResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.DepartmentRepository;
import com.mems.repository.MemberRepository;
import com.mems.repository.TransferRepository;
import com.mems.security.Actor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Chuyển phòng ban 4 bên (quy tắc 15): Trưởng phòng cũ, Trưởng phòng mới, HR,
 * và chính người được chuyển. Mỗi bước quyết định độc lập; đủ 4 duyệt thì áp
 * dụng trong cùng transaction, một bước từ chối thì dừng toàn bộ.
 *
 * <p>Trưởng phòng được xác định theo chức danh {@link #HEAD_POSITION_NAMES} đang
 * giữ assignment phạm vi DEPARTMENT của phòng đó. Thiếu trưởng phòng ở một trong
 * hai phòng thì không cho tạo yêu cầu (không bỏ qua bước).</p>
 */
@Service
public class TransferService {
    /**
     * Tên chức danh trưởng phòng — quy tắc 15. Giữ cả tên seed cũ
     * "Trưởng phòng ban" để tổ chức đang chạy không cần đổi dữ liệu.
     */
    public static final List<String> HEAD_POSITION_NAMES =
        List.of("Trưởng phòng", "Trưởng phòng ban");

    /**
     * Cấu hình hạn duyệt (ngày). Chưa triển khai tự huỷ khi quá hạn — Phần 4
     * chỉ để sẵn hook; 0 nghĩa là tắt.
     * TODO(Phần 4): thêm scheduler đánh dấu/huỷ yêu cầu PENDING quá hạn.
     */
    @Value("${transfer.approval.deadline-days:0}")
    private long approvalDeadlineDays;

    private final Actor actor;
    private final MembershipPolicy policy;
    private final EffectivePermissionsService effectivePermissions;
    private final DepartmentRepository departments;
    private final MemberRepository members;
    private final TransferRepository transfers;
    private final ClassReassignmentNotifier reassignments;
    private final NotificationService notifications;
    private final PeopleAuditService audit;

    public TransferService(Actor actor, MembershipPolicy policy,
                           EffectivePermissionsService effectivePermissions,
                           DepartmentRepository departments, MemberRepository members,
                           TransferRepository transfers, ClassReassignmentNotifier reassignments,
                           NotificationService notifications, PeopleAuditService audit) {
        this.actor = actor;
        this.policy = policy;
        this.effectivePermissions = effectivePermissions;
        this.departments = departments;
        this.members = members;
        this.transfers = transfers;
        this.reassignments = reassignments;
        this.notifications = notifications;
        this.audit = audit;
    }

    /** Hộp duyệt: các yêu cầu PENDING mà chính người gọi còn bước phải quyết định. */
    @Transactional(readOnly = true)
    public List<TransferResponse> inbox() {
        return transfers.listPending(actor.orgId()).stream()
            .map(this::decorate)
            .filter(r -> !r.actionableSteps().isEmpty())
            .toList();
    }

    /** Yêu cầu người gọi là người được chuyển hoặc người khởi tạo. */
    @Transactional(readOnly = true)
    public List<TransferResponse> mine() {
        return transfers.listRelated(actor.orgId(), actor.userId()).stream()
            .map(this::decorate)
            .toList();
    }

    /**
     * Người gọi có vai trò duyệt chuyển phòng (dù hiện chưa có yêu cầu nào):
     * OWNER, trưởng phòng bất kỳ, hoặc người giữ employee.approve_transfer.
     */
    @Transactional(readOnly = true)
    public boolean canDecideAny() {
        if (actor.owner()) return true;
        String orgId = actor.orgId();
        if (transfers.isHead(orgId, actor.userId(), HEAD_POSITION_NAMES)) return true;
        String departmentId = actor.departmentIdOrNull();
        return departmentId != null && policy.hasPermission(departmentId, "employee.approve_transfer");
    }

    @Transactional(readOnly = true)
    public TransferResponse detail(String id) {
        TransferResponse response = decorate(transfers.require(id, actor.orgId()));
        if (!canView(response)) throw actor.forbidden("Transfer request access denied");
        return response;
    }

    @Transactional
    public TransferResponse create(TransferCreateRequest request) {
        String orgId = actor.orgId();
        String fromDepartmentId = transfers.currentDepartment(orgId, request.userId())
            .orElseThrow(() -> new AppException(ErrorCode.MEMBER_NOT_FOUND));
        departments.require(request.toDepartmentId(), orgId, false);
        if (fromDepartmentId.equals(request.toDepartmentId()))
            throw new AppException(ErrorCode.TRANSFER_SAME_DEPARTMENT);
        if (!policy.hasPermission(fromDepartmentId, "employee.transfer")
            && !policy.hasPermission(request.toDepartmentId(), "employee.transfer"))
            throw actor.forbidden("Missing permission in department: employee.transfer");
        return createInternal(request.userId(), fromDepartmentId, request.toDepartmentId(), request.reason());
    }

    /** Nhân sự tự gửi yêu cầu chuyển phòng cho chính mình (không cần quyền quản lý). */
    @Transactional
    public TransferResponse createSelf(TransferCreateRequest request) {
        if (!actor.userId().equals(request.userId()))
            throw actor.forbidden("You can only request your own transfer");
        String orgId = actor.orgId();
        String fromDepartmentId = transfers.currentDepartment(orgId, actor.userId())
            .orElseThrow(() -> new AppException(ErrorCode.MEMBER_NOT_FOUND));
        departments.require(request.toDepartmentId(), orgId, false);
        if (fromDepartmentId.equals(request.toDepartmentId()))
            throw new AppException(ErrorCode.TRANSFER_SAME_DEPARTMENT);
        return createInternal(request.userId(), fromDepartmentId, request.toDepartmentId(), request.reason());
    }

    private TransferResponse createInternal(String userId, String fromDepartmentId,
                                            String toDepartmentId, String rawReason) {
        String orgId = actor.orgId();
        MemberResponse member = members.require(userId, orgId, fromDepartmentId, true);
        if ("OWNER".equals(member.role()))
            throw new AppException(ErrorCode.TRANSFER_OWNER_NOT_ALLOWED);
        if (!"ACTIVE".equals(member.status()))
            throw new AppException(ErrorCode.MEMBER_NOT_ACTIVE);
        if (transfers.hasPending(orgId, userId))
            throw new AppException(ErrorCode.TRANSFER_ALREADY_PENDING);

        requireHeads(orgId, fromDepartmentId, toDepartmentId);

        String id = UUID.randomUUID().toString();
        transfers.create(id, orgId, userId, fromDepartmentId, toDepartmentId,
            rawReason.trim(), actor.userId());

        TransferResponse created = decorate(transfers.require(id, orgId));
        notifications.notifyAll(orgId, parties(created), "TRANSFER_REQUESTED",
            "Yêu cầu chuyển phòng ban cần duyệt", summary(created), "TRANSFER_REQUEST", id);
        audit.record(orgId, actor.userId(), "TRANSFER_REQUESTED", userId,
            Map.of("requestId", id, "fromDepartmentId", fromDepartmentId,
                "toDepartmentId", toDepartmentId));
        return created;
    }

    @Transactional
    public TransferResponse decide(String id, String step, boolean approve, String note) {
        String orgId = actor.orgId();
        String normalized = step == null ? "" : step.trim().toUpperCase(Locale.ROOT);
        if (!TransferRepository.STEPS.contains(normalized))
            throw new AppException(ErrorCode.INVALID_TRANSFER_STEP);

        TransferResponse request = transfers.requireForUpdate(id, orgId);
        requirePending(request);
        if (!canDecide(request, normalized))
            throw new AppException(ErrorCode.TRANSFER_STEP_NOT_ALLOWED);

        String decision = approve ? "APPROVED" : "REJECTED";
        if (!transfers.decideStep(id, normalized, decision, actor.userId(), trimToNull(note)))
            throw new AppException(ErrorCode.TRANSFER_STEP_ALREADY_DECIDED);

        if (approve) {
            TransferResponse updated = transfers.require(id, orgId);
            boolean allApproved = updated.steps().stream()
                .allMatch(s -> "APPROVED".equals(s.decision()));
            if (allApproved) apply(updated);
        } else {
            transfers.rejectRequest(id);
            notifications.notifyAll(orgId, outcomeRecipients(request), "TRANSFER_REJECTED",
                "Yêu cầu chuyển phòng ban bị từ chối",
                summary(request) + (trimToNull(note) == null ? "" : " Ghi chú: " + note.trim()),
                "TRANSFER_REQUEST", id);
        }

        audit.record(orgId, actor.userId(),
            approve ? "TRANSFER_STEP_APPROVED" : "TRANSFER_STEP_REJECTED",
            request.userId(), Map.of("requestId", id, "step", normalized));
        return decorate(transfers.require(id, orgId));
    }

    @Transactional
    public TransferResponse cancel(String id, String note) {
        String orgId = actor.orgId();
        TransferResponse request = transfers.requireForUpdate(id, orgId);
        requirePending(request);
        if (!actor.userId().equals(request.requestedBy()))
            throw new AppException(ErrorCode.TRANSFER_CANCEL_NOT_ALLOWED);

        transfers.cancel(id, actor.userId());
        notifications.notifyAll(orgId, parties(request), "TRANSFER_CANCELLED",
            "Yêu cầu chuyển phòng ban đã bị huỷ",
            summary(request) + (trimToNull(note) == null ? "" : " Lý do: " + note.trim()),
            "TRANSFER_REQUEST", id);
        audit.record(orgId, actor.userId(), "TRANSFER_CANCELLED", request.userId(),
            Map.of("requestId", id));
        return decorate(transfers.require(id, orgId));
    }

    private void apply(TransferResponse request) {
        String orgId = actor.orgId();
        MemberResponse member = members.require(
            request.userId(), orgId, request.fromDepartmentId(), true);
        if (!"ACTIVE".equals(member.status()))
            throw new AppException(ErrorCode.MEMBER_NOT_ACTIVE);

        int revoked = members.transferToDepartment(request.userId(), orgId,
            request.fromDepartmentId(), request.toDepartmentId(), actor.userId(),
            "Chuyển phòng ban: " + request.reason());
        transfers.markApplied(request.id(), actor.userId());
        int flaggedClasses = reassignments.flagAndNotify(orgId, request.userId(),
            "Giáo viên được chuyển phòng ban");

        notifications.notifyAll(orgId, outcomeRecipients(request), "TRANSFER_APPROVED",
            "Yêu cầu chuyển phòng ban đã được duyệt", summary(request),
            "TRANSFER_REQUEST", request.id());
        if (flaggedClasses > 0) {
            notifications.notify(orgId, request.userId(), "CLASS_REASSIGNMENT_NEEDED",
                "Lớp đang dạy cần phân công lại",
                "Có " + flaggedClasses + " lớp cần phân công giáo viên khác sau khi chuyển phòng ban.",
                "TRANSFER_REQUEST", request.id());
        }

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("requestId", request.id());
        details.put("fromDepartmentId", request.fromDepartmentId());
        details.put("toDepartmentId", request.toDepartmentId());
        details.put("revokedAssignments", revoked);
        details.put("classesNeedingReassignment", flaggedClasses);
        audit.record(orgId, actor.userId(), "TRANSFER_APPLIED", request.userId(), details);
    }

    private void requireHeads(String orgId, String fromDepartmentId, String toDepartmentId) {
        if (transfers.headHolders(orgId, fromDepartmentId, HEAD_POSITION_NAMES).isEmpty()
            || transfers.headHolders(orgId, toDepartmentId, HEAD_POSITION_NAMES).isEmpty())
            throw new AppException(ErrorCode.TRANSFER_HEAD_MISSING);
    }

    private void requirePending(TransferResponse request) {
        if (!"PENDING".equals(request.status()))
            throw new AppException(ErrorCode.TRANSFER_NOT_PENDING);
    }

    private boolean canView(TransferResponse request) {
        if (actor.owner()) return true;
        if (actor.userId().equals(request.userId())
            || actor.userId().equals(request.requestedBy())) return true;
        String orgId = actor.orgId();
        if (transfers.headHolders(orgId, request.fromDepartmentId(), HEAD_POSITION_NAMES)
                .contains(actor.userId())
            || transfers.headHolders(orgId, request.toDepartmentId(), HEAD_POSITION_NAMES)
                .contains(actor.userId())) return true;
        return policy.hasPermission(request.fromDepartmentId(), "employee.approve_transfer")
            || policy.hasPermission(request.toDepartmentId(), "employee.approve_transfer");
    }

    private boolean canDecide(TransferResponse request, String step) {
        String orgId = actor.orgId();
        return switch (step) {
            case "SOURCE_HEAD" -> transfers
                .headHolders(orgId, request.fromDepartmentId(), HEAD_POSITION_NAMES)
                .contains(actor.userId());
            case "TARGET_HEAD" -> transfers
                .headHolders(orgId, request.toDepartmentId(), HEAD_POSITION_NAMES)
                .contains(actor.userId());
            case "HR" -> policy.hasPermission(request.fromDepartmentId(), "employee.approve_transfer")
                || policy.hasPermission(request.toDepartmentId(), "employee.approve_transfer");
            case "EMPLOYEE" -> actor.userId().equals(request.userId());
            default -> false;
        };
    }

    private TransferResponse decorate(TransferResponse request) {
        return request.withActionableSteps(actionableSteps(request));
    }

    private List<String> actionableSteps(TransferResponse request) {
        if (!"PENDING".equals(request.status())) return List.of();
        List<String> result = new ArrayList<>();
        for (TransferStepResponse step : request.steps()) {
            if ("PENDING".equals(step.decision()) && canDecide(request, step.step()))
                result.add(step.step());
        }
        return result;
    }

    /**
     * Bốn bên nhận thông báo khi yêu cầu được tạo/huỷ: trưởng phòng cũ, trưởng
     * phòng mới, chính nhân sự và người có quyền duyệt bước HR.
     */
    private Set<String> parties(TransferResponse request) {
        String orgId = actor.orgId();
        Set<String> result = new TreeSet<>();
        result.addAll(transfers.headHolders(orgId, request.fromDepartmentId(), HEAD_POSITION_NAMES));
        result.addAll(transfers.headHolders(orgId, request.toDepartmentId(), HEAD_POSITION_NAMES));
        result.add(request.userId());
        result.addAll(approvers(orgId, List.of(request.fromDepartmentId(), request.toDepartmentId())));
        return result;
    }

    private Set<String> approvers(String orgId, Collection<String> departmentIds) {
        Set<String> result = new TreeSet<>();
        for (String userId : transfers.assignmentHolders(orgId, departmentIds)) {
            String departmentId = transfers.currentDepartment(orgId, userId).orElse(null);
            if (effectivePermissions.resolve(orgId, userId, departmentId).permissions()
                .contains("employee.approve_transfer")) {
                result.add(userId);
            }
        }
        return result;
    }

    /** Kết quả chỉ cần tới người khởi tạo và người được chuyển. */
    private Set<String> outcomeRecipients(TransferResponse request) {
        Set<String> result = new TreeSet<>();
        result.add(request.requestedBy());
        result.add(request.userId());
        return result;
    }

    private String summary(TransferResponse request) {
        String name = request.fullName() == null || request.fullName().isBlank()
            ? request.username() : request.fullName();
        return name + " chuyển từ " + request.fromDepartmentName()
            + " sang " + request.toDepartmentName() + ". Lý do: " + request.reason();
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
