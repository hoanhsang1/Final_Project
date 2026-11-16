package com.mems.service;

import com.mems.client.IdentityClient;
import com.mems.dto.DelegationCreateRequest;
import com.mems.dto.DelegationResponse;
import com.mems.dto.DelegationRevokeRequest;
import com.mems.dto.DelegationUpdateRequest;
import com.mems.dto.PermissionResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.DelegationRepository;
import com.mems.repository.GeneralManagerRepository;
import com.mems.security.Actor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

/**
 * Ủy quyền quyền hạn từ Owner cho Tổng quản lý (quy tắc 3, 7).
 *
 * <p>Chỉ Owner được tạo/điều chỉnh/thu hồi. Người nhận không được ủy quyền lại
 * và không được nhận quyền vượt quá quyền người ủy quyền đang có.</p>
 */
@Service
public class DelegationService {
    public static final String SCOPE_ORGANIZATION = "ORGANIZATION";

    private final Actor actor;
    private final DelegationRepository delegations;
    private final GeneralManagerRepository managers;
    private final EffectivePermissionsService effectivePermissions;
    private final IdentityClient identity;
    private final PeopleAuditService audit;

    public DelegationService(Actor actor, DelegationRepository delegations,
                             GeneralManagerRepository managers,
                             EffectivePermissionsService effectivePermissions,
                             IdentityClient identity, PeopleAuditService audit) {
        this.actor = actor;
        this.delegations = delegations;
        this.managers = managers;
        this.effectivePermissions = effectivePermissions;
        this.identity = identity;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<DelegationResponse> list(boolean activeOnly) {
        requireOwner();
        return delegations.list(actor.orgId(), activeOnly);
    }

    /** Quyền đang được ủy quyền cho chính mình — mọi tài khoản trong tổ chức. */
    @Transactional(readOnly = true)
    public List<DelegationResponse> mine() {
        return delegations.listForDelegate(actor.orgId(), actor.userId(), true);
    }

    @Transactional
    public DelegationResponse create(DelegationCreateRequest request) {
        requireOwner();
        String orgId = actor.orgId();
        String actorId = actor.userId();
        String delegateId = request.delegateId().trim();

        if (actorId.equals(delegateId)) {
            throw new AppException(ErrorCode.DELEGATION_SELF_NOT_ALLOWED);
        }
        // Cấm ủy quyền lại: người đang nhận ủy quyền không được tạo ủy quyền mới.
        if (delegations.hasActiveAsDelegate(orgId, actorId)) {
            throw new AppException(ErrorCode.DELEGATION_RE_DELEGATION_FORBIDDEN);
        }
        if (!managers.isActiveMember(orgId, delegateId)) {
            throw new AppException(ErrorCode.MEMBER_NOT_FOUND);
        }
        if (!managers.isGeneralManager(orgId, delegateId,
                GeneralManagerService.GENERAL_MANAGER_POSITION_NAME)) {
            throw new AppException(ErrorCode.DELEGATE_NOT_GENERAL_MANAGER);
        }
        if (!SCOPE_ORGANIZATION.equals(request.scope())) {
            throw new AppException(ErrorCode.DELEGATION_SCOPE_NOT_SUPPORTED);
        }

        validatePermissions(request.permissions());
        Instant from = request.effectiveFrom() == null ? Instant.now() : request.effectiveFrom();
        requireValidWindow(from, request.effectiveTo());
        String reason = trimToNull(request.reason());

        String id = UUID.randomUUID().toString();
        delegations.insert(id, orgId, actorId, delegateId, SCOPE_ORGANIZATION, from,
            request.effectiveTo(), reason, actorId, request.permissions());

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("delegateId", delegateId);
        details.put("permissions", new TreeSet<>(request.permissions()));
        details.put("scope", SCOPE_ORGANIZATION);
        details.put("effectiveFrom", from);
        details.put("effectiveTo", request.effectiveTo());
        details.put("reason", reason);
        audit.record(orgId, actorId, "DELEGATION_CREATED", id, details);

        return delegations.require(id, orgId);
    }

    @Transactional
    public DelegationResponse update(String id, DelegationUpdateRequest request) {
        requireOwner();
        String orgId = actor.orgId();
        DelegationResponse before = delegations.require(id, orgId);
        if (!"ACTIVE".equals(before.status())) {
            throw new AppException(ErrorCode.DELEGATION_NOT_ACTIVE);
        }

        validatePermissions(request.permissions());
        Instant from = request.effectiveFrom() == null ? before.effectiveFrom() : request.effectiveFrom();
        requireValidWindow(from, request.effectiveTo());
        String reason = trimToNull(request.reason());

        delegations.updateWindow(id, orgId, from, request.effectiveTo(), reason);
        delegations.replacePermissions(id, request.permissions());

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("before", before);
        details.put("permissions", new TreeSet<>(request.permissions()));
        details.put("effectiveFrom", from);
        details.put("effectiveTo", request.effectiveTo());
        details.put("reason", reason);
        audit.record(orgId, actor.userId(), "DELEGATION_UPDATED", id, details);

        return delegations.require(id, orgId);
    }

    @Transactional
    public DelegationResponse revoke(String id, DelegationRevokeRequest request) {
        requireOwner();
        String orgId = actor.orgId();
        DelegationResponse before = delegations.require(id, orgId);
        if (!"ACTIVE".equals(before.status())) {
            throw new AppException(ErrorCode.DELEGATION_NOT_ACTIVE);
        }
        String reason = trimToNull(request == null ? null : request.reason());
        delegations.revoke(id, orgId, actor.userId(), reason);

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("delegateId", before.delegateId());
        details.put("reason", reason);
        audit.record(orgId, actor.userId(), "DELEGATION_REVOKED", id, details);

        return delegations.require(id, orgId);
    }

    /**
     * Quyền ủy quyền phải tồn tại trong catalog và nằm trong quyền hiện có của
     * người ủy quyền. Với OWNER, tập quyền hiện có là toàn bộ catalog.
     */
    private void validatePermissions(Set<String> requested) {
        Map<String, PermissionResponse> catalog = new TreeMap<>();
        for (PermissionResponse permission : identity.permissions()) {
            catalog.put(permission.code(), permission);
        }

        Set<String> available = actor.owner()
            ? catalog.keySet()
            : effectivePermissions.resolve(actor.orgId(), actor.userId()).permissions();

        for (String code : requested) {
            PermissionResponse definition = catalog.get(code);
            if (definition == null) throw new AppException(ErrorCode.UNKNOWN_PERMISSION);
            // Ủy quyền hiện chỉ phạm vi ORGANIZATION → quyền không hỗ trợ phạm vi này
            // sẽ không bao giờ có hiệu lực, nên chặn ngay thay vì im lặng bỏ qua.
            if (!definition.allowedScopes().contains(SCOPE_ORGANIZATION)) {
                throw new AppException(ErrorCode.DELEGATION_SCOPE_NOT_SUPPORTED);
            }
            if (!available.contains(code)) {
                throw new AppException(ErrorCode.DELEGATION_PERMISSION_NOT_HELD);
            }
        }
    }

    private void requireValidWindow(Instant from, Instant to) {
        if (to != null && !to.isAfter(from)) {
            throw new AppException(ErrorCode.DELEGATION_INVALID_WINDOW);
        }
    }

    private void requireOwner() {
        if (!actor.owner()) throw actor.forbidden("Only the organization owner can manage delegations");
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
