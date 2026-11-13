package com.mems.service;

import com.mems.client.IdentityClient;
import com.mems.dto.PermissionResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class EffectivePermissionsService {
    private final JdbcTemplate jdbc;
    private final IdentityClient identityClient;

    public EffectivePermissionsService(JdbcTemplate jdbc, IdentityClient identityClient) {
        this.jdbc = jdbc;
        this.identityClient = identityClient;
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
}
