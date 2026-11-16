package com.mems.service;
import com.mems.client.PeopleAuthorizationClient;
import com.mems.dto.AccessProfile;
import com.mems.entity.Account;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AccessProfileService {
    private final PeopleAuthorizationClient people;
    private final JdbcTemplate jdbc;
    public AccessProfileService(PeopleAuthorizationClient people,JdbcTemplate jdbc) { this.people=people;this.jdbc=jdbc; }
    /** Quyền tự phục vụ mà mọi tài khoản STUDENT/TEACHER luôn có. */
    private static final Set<String> SELF_PERMISSIONS =
        Set.of("student.self_view", "class.self_view", "schedule.self_view");

    public AccessProfile resolve(Account account,List<String> roles) {
        if(roles.contains("OWNER") || roles.contains("ORG_OWNER"))
            return new AccessProfile("OWNER",null,PermissionCatalog.ENTRIES.stream()
                .map(PermissionCatalog.PermissionDefinition::code).collect(Collectors.toCollection(TreeSet::new)));
        if(roles.contains("MANAGER") || roles.contains("STAFF")) return people.resolve(account.getId(),account.getOrgId());
        Set<String> permissions=new TreeSet<>(jdbc.queryForList("""
            SELECT DISTINCT p.code FROM permission p JOIN role_permission rp ON rp.permission_id=p.id
            JOIN account_role ar ON ar.role_id=rp.role_id WHERE ar.account_id=?
            """,String.class,account.getId()));
        // Cơ sở dữ liệu cũ có thể thiếu role_permission cho STUDENT/TEACHER.
        if (roles.contains("STUDENT") || roles.contains("TEACHER")) permissions.addAll(SELF_PERMISSIONS);
        return new AccessProfile(roles.get(0),null,permissions);
    }
}
