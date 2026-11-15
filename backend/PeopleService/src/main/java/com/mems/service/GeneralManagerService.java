package com.mems.service;

import com.mems.dto.GeneralManagerAppointRequest;
import com.mems.dto.GeneralManagerCandidateResponse;
import com.mems.dto.GeneralManagerResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.DelegationRepository;
import com.mems.repository.GeneralManagerRepository;
import com.mems.security.Actor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * Bổ nhiệm Tổng quản lý (quy tắc 3): chức danh cấp tổ chức, chỉ Owner gán.
 *
 * <p>Chức danh này KHÔNG kèm quyền nào. Quyền chỉ đến từ ủy quyền của Owner
 * ({@link DelegationService}) nên một Tổng quản lý mới bổ nhiệm không làm được
 * thao tác quản lý cao cấp nào.</p>
 */
@Service
public class GeneralManagerService {
    /**
     * TODO(PHẦN 6): xác nhận tên chức danh thực tế của tổ chức. Đổi tên ở đây
     * nếu tổ chức dùng tên khác; hệ thống tự tạo nếu chưa tồn tại.
     */
    public static final String GENERAL_MANAGER_POSITION_NAME = "Tổng quản lý";
    public static final String GENERAL_MANAGER_DESCRIPTION =
        "Ban điều hành — chỉ có quyền do Chủ tổ chức ủy quyền";

    private final Actor actor;
    private final GeneralManagerRepository managers;
    private final DelegationRepository delegations;
    private final PeopleAuditService audit;

    public GeneralManagerService(Actor actor, GeneralManagerRepository managers,
                                 DelegationRepository delegations, PeopleAuditService audit) {
        this.actor = actor;
        this.managers = managers;
        this.delegations = delegations;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<GeneralManagerResponse> list() {
        requireOwner();
        return managers.list(actor.orgId(), GENERAL_MANAGER_POSITION_NAME);
    }

    @Transactional(readOnly = true)
    public List<GeneralManagerCandidateResponse> candidates() {
        requireOwner();
        return managers.candidates(actor.orgId());
    }

    @Transactional
    public GeneralManagerResponse appoint(GeneralManagerAppointRequest request) {
        requireOwner();
        String orgId = actor.orgId();
        String userId = request.userId();

        if (!managers.isActiveMember(orgId, userId)) {
            throw new AppException(ErrorCode.MEMBER_NOT_FOUND);
        }
        if (managers.isGeneralManager(orgId, userId, GENERAL_MANAGER_POSITION_NAME)) {
            throw new AppException(ErrorCode.GENERAL_MANAGER_ALREADY_APPOINTED);
        }

        String positionId = managers.findPositionId(orgId, GENERAL_MANAGER_POSITION_NAME);
        if (positionId == null) {
            positionId = managers.createPosition(orgId, GENERAL_MANAGER_POSITION_NAME,
                GENERAL_MANAGER_DESCRIPTION);
            audit.record(orgId, actor.userId(), "GENERAL_MANAGER_POSITION_CREATED", positionId,
                Map.of("name", GENERAL_MANAGER_POSITION_NAME));
        }
        managers.addAssignment(orgId, userId, positionId, actor.userId(), trimToNull(request.reason()));
        audit.record(orgId, actor.userId(), "GENERAL_MANAGER_APPOINTED", userId,
            Map.of("positionId", positionId, "positionName", GENERAL_MANAGER_POSITION_NAME));

        return managers.list(orgId, GENERAL_MANAGER_POSITION_NAME).stream()
            .filter(item -> item.userId().equals(userId))
            .findFirst()
            .orElseThrow(() -> new AppException(ErrorCode.MEMBER_NOT_FOUND));
    }

    @Transactional
    public void remove(String userId, String reason) {
        requireOwner();
        String orgId = actor.orgId();
        if (!managers.isGeneralManager(orgId, userId, GENERAL_MANAGER_POSITION_NAME)) {
            throw new AppException(ErrorCode.GENERAL_MANAGER_NOT_APPOINTED);
        }
        String positionId = managers.findPositionId(orgId, GENERAL_MANAGER_POSITION_NAME);
        String note = trimToNull(reason);

        managers.revokeAssignment(orgId, userId, positionId, actor.userId(),
            note == null ? "Bãi nhiệm Tổng quản lý" : note);

        // Bãi nhiệm thì mọi ủy quyền còn hiệu lực cũng phải mất ngay.
        List<String> revoked = delegations.revokeAllForDelegate(orgId, userId, actor.userId(),
            note == null ? "Bãi nhiệm Tổng quản lý" : note);
        for (String delegationId : revoked) {
            audit.record(orgId, actor.userId(), "DELEGATION_REVOKED", delegationId,
                Map.of("reason", "Bãi nhiệm Tổng quản lý", "delegateId", userId));
        }
        audit.record(orgId, actor.userId(), "GENERAL_MANAGER_REVOKED", userId,
            Map.of("positionId", positionId, "revokedDelegations", revoked.size()));
    }

    private void requireOwner() {
        if (!actor.owner()) throw actor.forbidden("Only the organization owner can appoint general managers");
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
