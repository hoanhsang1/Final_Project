package com.mems.service;
import com.mems.repository.*;
import com.mems.security.Actor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class MembershipPolicy {
    private final Actor actor;
    private final MemberRepository members;
    private final PositionRepository positions;
    private final JdbcTemplate jdbc;
    public MembershipPolicy(Actor actor,MemberRepository members,PositionRepository positions,JdbcTemplate jdbc) {
        this.actor=actor;this.members=members;this.positions=positions;this.jdbc=jdbc;
    }
    public void check(String departmentId,String targetRole,Set<String> proposedPositions) {
        actor.requireDepartment(departmentId);
        String orgId=actor.orgId();
        Set<String> ownPositions=new TreeSet<>();
        if(!actor.owner()) {
            var manager=members.require(actor.userId(),orgId,departmentId,true);
            if(!"MANAGER".equals(manager.role()) || !"STAFF".equals(targetRole))
                throw actor.forbidden("Managers may only manage STAFF in their own department");
            ownPositions.addAll(members.positionIds(actor.userId(),true));
        }
        Set<String> all=new TreeSet<>(proposedPositions);
        all.addAll(ownPositions);
        Map<String,Set<String>> grants=new HashMap<>();
        // Lock templates in stable order so concurrent owner edits cannot broaden a grant unnoticed.
        for(String id:all) {
            positions.require(id,orgId,true);
            grants.put(id,new HashSet<>(jdbc.queryForList(
                "SELECT permission_code FROM position_permission WHERE position_id=? FOR UPDATE",String.class,id)));
        }
        if(!actor.owner()) {
            Set<String> available=new HashSet<>(),requested=new HashSet<>();
            ownPositions.forEach(id -> available.addAll(grants.get(id)));
            proposedPositions.forEach(id -> requested.addAll(grants.get(id)));
            if(!available.contains("PEOPLE_EDIT") || !available.containsAll(requested))
                throw actor.forbidden("Cannot assign permissions beyond your current permissions");
        }
    }
    public void protectOwner(String targetId) {
        if(actor.owner() && actor.userId().equals(targetId))
            throw actor.forbidden("Owners cannot remove their own access");
    }
}
