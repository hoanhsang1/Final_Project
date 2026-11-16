package com.mems.service;

import com.mems.client.IdentityClient;
import com.mems.dto.ResignationCreateRequest;
import com.mems.dto.ResignationDecisionRequest;
import com.mems.dto.ResignationResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.DepartmentRepository;
import com.mems.repository.MemberRepository;
import com.mems.repository.ResignationRepository;
import com.mems.repository.TeacherRepository;
import com.mems.security.Actor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Nghỉ việc — duyệt theo thứ tự leo thang (kế hoạch v2 §1.5, DEC-08):
 * HR có quyền → Trưởng phòng → Tổng quản lý có ủy quyền → OWNER.
 *
 * <p>Không ai duyệt được yêu cầu của chính mình. Không có tự duyệt/tự từ chối
 * theo thời gian; quá hạn chỉ nhắc việc.</p>
 *
 * <p>Khi duyệt: vô hiệu tài khoản, thu hồi toàn bộ chức danh, đánh dấu nhân sự
 * RESIGNED, chuyển giáo viên sang NGHI_VIEC và gọi hook phân công lại lớp.
 * TODO(ủy quyền): thu hồi ủy quyền của người nghỉ việc tại đây khi có yêu cầu.</p>
 */
@Service
public class ResignationService {
    private final Actor actor;
    private final MembershipPolicy policy;
    private final DepartmentRepository departments;
    private final MemberRepository members;
    private final ResignationRepository requests;
    private final TeacherRepository teachers;
    private final IdentityClient identity;
    private final PeopleAuditService audit;
    private final TeacherOffboardingHook offboarding;
    private final ResignationApprovalPolicy approval;
    private final NotificationService notifications;

    public ResignationService(Actor actor, MembershipPolicy policy, DepartmentRepository departments,
                              MemberRepository members, ResignationRepository requests,
                              TeacherRepository teachers, IdentityClient identity,
                              PeopleAuditService audit, TeacherOffboardingHook offboarding,
                              ResignationApprovalPolicy approval, NotificationService notifications) {
        this.actor = actor;
        this.policy = policy;
        this.departments = departments;
        this.members = members;
        this.requests = requests;
        this.teachers = teachers;
        this.identity = identity;
        this.audit = audit;
        this.offboarding = offboarding;
        this.approval = approval;
        this.notifications = notifications;
    }

    @Transactional(readOnly = true)
    public List<ResignationResponse> list(String departmentId, String status) {
        policy.requirePermission(departmentId, "employee.view");
        departments.require(departmentId, actor.orgId(), false);
        return requests.list(actor.orgId(), departmentId, status);
    }

    @Transactional
    public ResignationResponse create(String departmentId, ResignationCreateRequest request) {
        String orgId = actor.orgId();
        policy.requirePermission(departmentId, "employee.resign");
        departments.require(departmentId, orgId, false);
        var member = members.require(request.userId(), orgId, departmentId, true);
        if ("OWNER".equals(member.role()))
            throw actor.forbidden("Owner appointments cannot resign through this workflow");
        if (!"ACTIVE".equals(member.status()))
            throw new AppException(ErrorCode.MEMBER_NOT_ACTIVE);
        if (requests.hasPending(orgId, request.userId()))
            throw new AppException(ErrorCode.RESIGNATION_ALREADY_PENDING);

        String id = UUID.randomUUID().toString();
        String reason = request.reason().trim();
        requests.create(id, orgId, request.userId(), departmentId, reason, actor.userId());
        audit.record(orgId, actor.userId(), "RESIGNATION_REQUESTED", request.userId(),
            Map.of("requestId", id, "reason", reason));
        notifications.notifyAll(orgId,
            approval.approverIds(orgId, departmentId, actor.userId()),
            "RESIGNATION_REQUESTED", "Yêu cầu nghỉ việc cần duyệt",
            "Nhân sự " + request.userId() + " xin nghỉ việc. Lý do: " + reason,
            "RESIGNATION_REQUEST", id);
        return requests.require(id, orgId, departmentId);
    }

    @Transactional
    public ResignationResponse approve(String departmentId, String requestId,
                                       ResignationDecisionRequest request) {
        String orgId = actor.orgId();
        departments.require(departmentId, orgId, false);
        var resignation = requests.requireForUpdate(requestId, orgId, departmentId);
        requirePending(resignation);
        approval.requireApprover(orgId, departmentId, resignation.requestedBy());

        var member = members.require(resignation.userId(), orgId, departmentId, true);
        if (!"ACTIVE".equals(member.status()))
            throw new AppException(ErrorCode.MEMBER_NOT_ACTIVE);

        String reason = "Nghỉ việc: " + resignation.reason();
        identity.disableAccount(member.userId(), orgId);
        members.revokeAll(member.userId(), orgId, actor.userId(), reason);
        members.markResigned(member.userId(), orgId);
        teachers.markResigned(member.userId(), orgId);
        long activeClasses = teachers.activeClassCount(member.userId(), orgId);
        if (activeClasses > 0) {
            offboarding.teacherNeedsReassignment(orgId, member.userId(), activeClasses);
        }
        requests.decide(requestId, "APPROVED", actor.userId(), trimToNull(request.note()));

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("requestId", requestId);
        details.put("activeClasses", activeClasses);
        details.put("needsReassignment", activeClasses > 0);
        audit.record(orgId, actor.userId(), "MEMBER_RESIGNED", member.userId(), details);
        audit.record(orgId, actor.userId(), "RESIGNATION_APPROVED", member.userId(),
            Map.of("requestId", requestId));
        notifications.notify(orgId, resignation.requestedBy(), "RESIGNATION_APPROVED",
            "Yêu cầu nghỉ việc đã được duyệt",
            "Nhân sự " + member.userId() + " đã được duyệt nghỉ việc.",
            "RESIGNATION_REQUEST", requestId);
        notifications.notify(orgId, member.userId(), "RESIGNATION_APPROVED",
            "Yêu cầu nghỉ việc đã được duyệt",
            "Tài khoản và chức danh của bạn đã được vô hiệu hóa.",
            "RESIGNATION_REQUEST", requestId);
        return requests.require(requestId, orgId, departmentId);
    }

    @Transactional
    public ResignationResponse reject(String departmentId, String requestId,
                                      ResignationDecisionRequest request) {
        String orgId = actor.orgId();
        departments.require(departmentId, orgId, false);
        var resignation = requests.requireForUpdate(requestId, orgId, departmentId);
        requirePending(resignation);
        approval.requireApprover(orgId, departmentId, resignation.requestedBy());
        requests.decide(requestId, "REJECTED", actor.userId(), trimToNull(request.note()));
        audit.record(orgId, actor.userId(), "RESIGNATION_REJECTED", resignation.userId(),
            Map.of("requestId", requestId));
        notifications.notify(orgId, resignation.requestedBy(), "RESIGNATION_REJECTED",
            "Yêu cầu nghỉ việc bị từ chối",
            trimToNull(request.note()) == null ? "" : request.note().trim(),
            "RESIGNATION_REQUEST", requestId);
        return requests.require(requestId, orgId, departmentId);
    }

    private void requirePending(ResignationResponse resignation) {
        if (!"PENDING".equals(resignation.status()))
            throw new AppException(ErrorCode.RESIGNATION_NOT_PENDING);
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
