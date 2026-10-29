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
    public AccessProfile resolve(Account account,List<String> roles) {
        if(roles.contains("OWNER") || roles.contains("ORG_OWNER"))
            return new AccessProfile("OWNER",null,PermissionCatalog.ENTRIES.stream()
                .map(PermissionCatalog.PermissionDefinition::code).collect(Collectors.toCollection(TreeSet::new)));
        if(roles.contains("MANAGER") || roles.contains("STAFF")) return people.resolve(account.getId(),account.getOrgId());
        Set<String> permissions=new TreeSet<>(jdbc.queryForList("""
            SELECT DISTINCT p.code FROM permission p JOIN role_permission rp ON rp.permission_id=p.id
            JOIN account_role ar ON ar.role_id=rp.role_id WHERE ar.account_id=?
            """,String.class,account.getId()));
        return new AccessProfile(roles.get(0),null,permissions);
    }
}
