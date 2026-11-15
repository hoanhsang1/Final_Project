package com.mems.service;

import com.mems.client.IdentityClient;
import com.mems.dto.PermissionBundleResponse;
import com.mems.dto.PermissionResponse;
import com.mems.repository.AssignmentRepository;
import com.mems.repository.PositionRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

/**
 * Quyền hiệu lực = hợp các assignment đang ACTIVE + bundle của chức vụ.
 *
 * <p>Phạm vi: {@code ORGANIZATION} hoặc {@code DEPARTMENT:<departmentId>}.
 * Quyền DEPARTMENT chỉ áp dụng cho nhân viên thuộc đúng phòng ban đó.</p>
 */
@Service
public class EffectivePermissionsService {
    /**
     * Quyền hiệu lực + phạm vi + tập con đến từ ủy quyền (nguồn DELEGATED).
     * Tách riêng để JWT/audit đánh dấu được quyền nào không đến từ chức vụ.
     */
    public record EffectivePermissions(Set<String> permissions, Map<String, Set<String>> scopes,
                                       Set<String> delegatedPermissions) {
        public EffectivePermissions(Set<String> permissions, Map<String, Set<String>> scopes) {
            this(permissions, scopes, Set.of());
        }

        public EffectivePermissions {
            permissions = permissions == null ? Set.of() : permissions;
            scopes = scopes == null ? Map.of() : scopes;
            delegatedPermissions = delegatedPermissions == null ? Set.of() : delegatedPermissions;
        }
    }

    private final JdbcTemplate jdbc;
    private final IdentityClient identityClient;
    private final AssignmentRepository assignments;
    private final PositionRepository positions;

    public EffectivePermissionsService(JdbcTemplate jdbc, IdentityClient identityClient,
                                       AssignmentRepository assignments, PositionRepository positions) {
        this.jdbc = jdbc;
        this.identityClient = identityClient;
        this.assignments = assignments;
        this.positions = positions;
    }

    public Set<String> departmentModules(String orgId, String departmentId) {
        if (departmentId == null || departmentId.isBlank()) {
            return Collections.emptySet();
        }
        return new HashSet<>(jdbc.queryForList(
            "SELECT module_code FROM department_module WHERE department_id=? AND org_id=?",
            String.class, departmentId, orgId
        ));
    }

    public Map<String, String> permissionModuleMap() {
        List<PermissionResponse> permissions = identityClient.permissions();
        Map<String, String> map = new HashMap<>();
        for (PermissionResponse p : permissions) {
            map.put(p.code(), p.moduleCode());
        }
        return map;
    }

    public Map<String, Set<String>> permissionAllowedScopes() {
        Map<String, Set<String>> map = new HashMap<>();
        for (PermissionResponse p : identityClient.permissions()) {
            map.put(p.code(), p.allowedScopes());
        }
        return map;
    }

    public Map<String, Set<String>> bundlePermissions() {
        Map<String, Set<String>> map = new HashMap<>();
        for (PermissionBundleResponse bundle : identityClient.permissionBundles()) {
            map.put(bundle.code(), new HashSet<>(bundle.permissions()));
        }
        return map;
    }

    /** Quyền thô của chức vụ, đã mở rộng bundle. */
    public Set<String> expandPositions(String orgId, Collection<String> positionIds) {
        Set<String> result = new TreeSet<>();
        if (positionIds == null) return result;
        Map<String, Set<String>> bundles = bundlePermissions();
        for (String id : positionIds) {
            result.addAll(positions.permissions(id));
            positions.bundleCodes(id).forEach(code -> result.addAll(bundles.getOrDefault(code, Set.of())));
        }
        return result;
    }

    /** Giữ API cũ: chỉ lọc quyền thô theo module của phòng ban. */
    public Set<String> compute(String orgId, String departmentId, Set<String> rawPermissions) {
        if (rawPermissions == null || rawPermissions.isEmpty()) {
            return Collections.emptySet();
        }
        Set<String> deptModules = departmentModules(orgId, departmentId);
        Map<String, String> moduleMap = permissionModuleMap();

        Set<String> effective = new TreeSet<>();
        for (String perm : rawPermissions) {
            String requiredModule = moduleMap.get(perm);
            if (requiredModule == null || requiredModule.isBlank() || deptModules.contains(requiredModule)) {
                effective.add(perm);
            }
        }
        return effective;
    }

    /**
     * Quyền đang được ủy quyền còn hiệu lực: mã quyền → id lần ủy quyền.
     *
     * <p>Chỉ đọc DB (không gọi Identity) để dùng được trong filter kiểm tra
     * quyền ở mỗi request. Hết hạn/đã thu hồi bị loại ngay tại đây.</p>
     */
    public Map<String, String> activeDelegationGrants(String orgId, String userId) {
        if (orgId == null || userId == null) return Map.of();
        Timestamp now = Timestamp.from(Instant.now());
        Map<String, String> grants = new TreeMap<>();
        jdbc.query("""
            SELECT dp.permission_code, d.id
            FROM delegation d
            JOIN delegation_permission dp ON dp.delegation_id=d.id
            WHERE d.org_id=? AND d.delegate_id=? AND d.status='ACTIVE'
              AND d.effective_from<=? AND (d.effective_to IS NULL OR d.effective_to>=?)
            ORDER BY d.id, dp.permission_code
            """,
            rs -> {
                grants.putIfAbsent(rs.getString("permission_code"), rs.getString("id"));
            },
            orgId, userId, now, now);
        return grants;
    }

    /** Quyền hiệu lực có phạm vi của một nhân viên. */
    public EffectivePermissions resolve(String orgId, String userId, String departmentId) {
        if (userId == null || orgId == null) {
            return new EffectivePermissions(Set.of(), Map.of());
        }
        Set<String> deptModules = departmentModules(orgId, departmentId);
        Map<String, String> moduleMap = permissionModuleMap();
        Map<String, Set<String>> allowedScopes = permissionAllowedScopes();
        Map<String, Set<String>> bundles = bundlePermissions();

        Set<String> effective = new TreeSet<>();
        Set<String> delegated = new TreeSet<>();
        Map<String, Set<String>> scopes = new TreeMap<>();
        for (AssignmentRepository.ActiveAssignment assignment : assignments.active(userId, orgId)) {
            String scopeToken;
            String scopeType;
            if ("ORGANIZATION".equals(assignment.scopeType())) {
                scopeType = "ORGANIZATION";
                scopeToken = "ORGANIZATION";
            } else {
                String assignmentDepartment = assignment.departmentId() != null
                    ? assignment.departmentId() : departmentId;
                if (assignmentDepartment == null || !assignmentDepartment.equals(departmentId)) {
                    continue;
                }
                scopeType = "DEPARTMENT";
                scopeToken = "DEPARTMENT:" + assignmentDepartment;
            }

            Set<String> raw = new TreeSet<>(positions.permissions(assignment.positionId()));
            positions.bundleCodes(assignment.positionId())
                .forEach(code -> raw.addAll(bundles.getOrDefault(code, Set.of())));

            for (String permission : raw) {
                String requiredModule = moduleMap.get(permission);
                if (requiredModule != null && !requiredModule.isBlank() && !deptModules.contains(requiredModule)) {
                    continue;
                }
                Set<String> allowed = allowedScopes.get(permission);
                if (allowed != null && !allowed.contains(scopeType)) {
                    continue;
                }
                effective.add(permission);
                scopes.computeIfAbsent(permission, key -> new TreeSet<>()).add(scopeToken);
            }
        }

        // Quyền ủy quyền chỉ hỗ trợ phạm vi ORGANIZATION (TODO Phần 6 nếu mở rộng).
        for (String permission : activeDelegationGrants(orgId, userId).keySet()) {
            Set<String> allowed = allowedScopes.get(permission);
            if (allowed != null && !allowed.contains("ORGANIZATION")) continue;
            effective.add(permission);
            delegated.add(permission);
            scopes.computeIfAbsent(permission, key -> new TreeSet<>()).add("ORGANIZATION");
        }
        return new EffectivePermissions(effective, scopes, delegated);
    }

    public EffectivePermissions resolve(String orgId, String userId) {
        String departmentId = null;
        var rows = jdbc.queryForList(
            "SELECT department_id FROM department_member WHERE user_id=? AND org_id=?",
            String.class, userId, orgId);
        if (!rows.isEmpty()) departmentId = rows.get(0);
        return resolve(orgId, userId, departmentId);
    }
}
