package com.mems.service;

import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.PositionRepository;
import com.mems.security.Actor;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Kiểm tra quyền quản lý nhân sự theo phạm vi phòng ban.
 *
 * <p>Quyền quản lý đến từ chức vụ ({@code employee.*}), không từ role MANAGER.
 * Người không phải OWNER chỉ được gán chức vụ có tập quyền ⊆ quyền hiệu lực
 * của mình, và chức vụ phải nằm trong module phòng ban đang bật.</p>
 */
@Service
public class MembershipPolicy {
    private final Actor actor;
    private final PositionRepository positions;
    private final EffectivePermissionsService effectivePermissions;

    public MembershipPolicy(Actor actor, PositionRepository positions,
                            EffectivePermissionsService effectivePermissions) {
        this.actor = actor;
        this.positions = positions;
        this.effectivePermissions = effectivePermissions;
    }

    /**
     * Quyền được xét lại theo phòng ban đích từ DB (không chỉ token), nên HR
     * phạm vi DEPARTMENT chỉ qua được phòng của mình, còn phạm vi ORGANIZATION
     * qua được mọi phòng ban (yêu cầu Phần 3).
     */
    public void requirePermission(String departmentId, String permission) {
        String orgId = actor.orgId();
        if (actor.owner()) return;
        Set<String> effective = effectivePermissions
            .resolve(orgId, actor.userId(), departmentId).permissions();
        if (!effective.contains(permission)) {
            throw actor.forbidden("Missing permission in department: " + permission);
        }
    }

    /** Dùng cho việc che trường nhạy cảm: trả về thay vì ném lỗi. */
    public boolean hasPermission(String departmentId, String permission) {
        if (actor.owner()) return true;
        return effectivePermissions.resolve(actor.orgId(), actor.userId(), departmentId)
            .permissions().contains(permission);
    }

    public void check(String departmentId, String targetRole, Set<String> proposedPositions) {
        String orgId = actor.orgId();

        // targetRole chỉ là nhãn thành viên, không phải căn cứ cấp quyền.
        if (!Set.of("MANAGER", "STAFF").contains(targetRole) && !"OWNER".equals(targetRole))
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                "Membership role must be MANAGER, STAFF or OWNER");
        if ("OWNER".equals(targetRole) && !actor.owner())
            throw actor.forbidden("Only the organization owner can manage owner appointments");

        // Luôn xác thực chức vụ thuộc tổ chức và khoá mẫu quyền.
        List<com.mems.dto.PositionResponse> loaded = new ArrayList<>();
        for (String id : proposedPositions) loaded.add(positions.require(id, orgId, true));

        if (actor.owner()) return;

        // Quy tắc 18 / Phần 2: chức danh cấp tổ chức (Tổng quản lý, HR cấp tổ chức) do Owner gán.
        if (loaded.stream().anyMatch(p -> "ORGANIZATION".equals(p.scope())))
            throw actor.forbidden("Only the organization owner can assign ORGANIZATION-scope positions");

        Set<String> available = effectivePermissions
            .resolve(orgId, actor.userId(), departmentId).permissions();
        if (!available.contains("employee.assign_position"))
            throw actor.forbidden("Missing permission: employee.assign_position");

        Set<String> requested = effectivePermissions.expandPositions(orgId, proposedPositions);

        Set<String> deptModules = effectivePermissions.departmentModules(orgId, departmentId);
        Map<String, String> permModuleMap = effectivePermissions.permissionModuleMap();
        for (String reqPerm : requested) {
            String mod = permModuleMap.get(reqPerm);
            if (mod != null && !mod.isBlank() && !deptModules.contains(mod)) {
                throw new AppException(ErrorCode.PERMISSION_OUT_OF_MODULE,
                    "Cannot assign permission outside department modules: " + reqPerm);
            }
        }

        if (!available.containsAll(requested))
            throw actor.forbidden("Cannot assign permissions beyond your current permissions");
    }

    public void protectOwner(String targetId) {
        if (actor.owner() && actor.userId().equals(targetId))
            throw actor.forbidden("Owners cannot remove their own access");
    }
}
