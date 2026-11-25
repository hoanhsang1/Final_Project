package com.mems.controller;

import com.mems.client.IdentityClient;
import com.mems.dto.EffectivePermissionsResponse;
import com.mems.dto.PermissionResponse;
import com.mems.repository.MemberRepository;
import com.mems.security.Actor;
import com.mems.security.RequirePermission;
import com.mems.service.EffectivePermissionsService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;

/** Xem quyền hiệu lực của chính mình hoặc của một nhân viên trong phòng ban. */
@RestController
public class EffectivePermissionController {
    private final Actor actor;
    private final MemberRepository members;
    private final EffectivePermissionsService effectivePermissions;
    private final IdentityClient identity;

    public EffectivePermissionController(Actor actor, MemberRepository members,
                                         EffectivePermissionsService effectivePermissions,
                                         IdentityClient identity) {
        this.actor = actor;
        this.members = members;
        this.effectivePermissions = effectivePermissions;
        this.identity = identity;
    }

    @GetMapping("/users/me/permissions")
    @Transactional(readOnly = true)
    public EffectivePermissionsResponse me() {
        String orgId = actor.orgId();
        String userId = actor.userId();
        Optional<String> departmentId = members.findDepartmentId(userId, orgId);
        if (departmentId.isEmpty()) {
            if (actor.owner()) return fullCatalog(userId, orgId);
            // STUDENT/TEACHER không thuộc phòng ban: quyền SELF nằm trong JWT.
            Set<String> authorities = new TreeSet<>(actor.authorities());
            authorities.removeIf(code -> code.startsWith("ROLE_"));
            if (!authorities.isEmpty()) {
                Map<String, Set<String>> scopes = new TreeMap<>();
                for (String code : authorities) scopes.put(code, Set.of("ORGANIZATION"));
                return new EffectivePermissionsResponse(userId, orgId, null, authorities, scopes);
            }
            return new EffectivePermissionsResponse(userId, orgId, null, Set.of(), Map.of());
        }
        var effective = effectivePermissions.resolve(orgId, userId, departmentId.get());
        return new EffectivePermissionsResponse(userId, orgId, departmentId.get(),
            effective.permissions(), effective.scopes(), effective.delegatedPermissions());
    }

    @GetMapping("/departments/{departmentId}/members/{userId}/permissions")
    @RequirePermission(value = "employee.view", department = "departmentId")
    @Transactional(readOnly = true)
    public EffectivePermissionsResponse member(@PathVariable String departmentId,
                                               @PathVariable String userId) {
        var member = members.require(userId, actor.orgId(), departmentId, false);
        var effective = effectivePermissions.resolve(actor.orgId(), userId, member.departmentId());
        return new EffectivePermissionsResponse(userId, actor.orgId(), member.departmentId(),
            effective.permissions(), effective.scopes(), effective.delegatedPermissions());
    }

    private EffectivePermissionsResponse fullCatalog(String userId, String orgId) {
        Set<String> permissions = new TreeSet<>();
        Map<String, Set<String>> scopes = new TreeMap<>();
        for (PermissionResponse permission : identity.permissions()) {
            permissions.add(permission.code());
            scopes.put(permission.code(), Set.of("ORGANIZATION"));
        }
        return new EffectivePermissionsResponse(userId, orgId, null, permissions, scopes);
    }
}
