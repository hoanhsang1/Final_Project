package com.mems.service;
import com.mems.client.IdentityClient;
import com.mems.dto.*;
import com.mems.repository.*;
import com.mems.security.Actor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.*;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.annotation.Transactional;
import java.security.SecureRandom;
import java.util.*;

@Service
public class MemberService {
    private final DepartmentRepository departments;
    private final MemberRepository members;
    private final MembershipPolicy policy;
    private final IdentityClient identity;
    private final AccountCompensationService compensation;
    private final PeopleAuditService audit;
    private final Actor actor;
    private final TransactionTemplate tx;
    private final SecureRandom random=new SecureRandom();
    public MemberService(DepartmentRepository departments,MemberRepository members,MembershipPolicy policy,
            IdentityClient identity,AccountCompensationService compensation,PeopleAuditService audit,Actor actor,
            PlatformTransactionManager manager) {
        this.departments=departments;this.members=members;this.policy=policy;this.identity=identity;
        this.compensation=compensation;this.audit=audit;this.actor=actor;
        this.tx=new TransactionTemplate(manager);this.tx.setTimeout(15);
    }
    @Transactional(readOnly=true)
    public List<MemberResponse> list(String departmentId) {
        actor.requireDepartment(departmentId);
        departments.require(departmentId,actor.orgId(),false);
        return members.list(actor.orgId(),departmentId);
    }
    public CreatedMemberResponse create(String departmentId,MemberRequest request) {
        String orgId=actor.orgId(),actorId=actor.userId();
        tx.executeWithoutResult(status -> validate(departmentId,request.role(),request.positionIds()));
        String userId=UUID.randomUUID().toString();
        byte[] bytes=new byte[24];random.nextBytes(bytes);
        String password=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        compensation.register(userId,orgId);
        try {
            identity.createAccount(userId,orgId,request,password,actorId);
            MemberResponse result=tx.execute(status -> {
                compensation.lock(userId);
                validate(departmentId,request.role(),request.positionIds());
                members.create(userId,orgId,departmentId,request.role(),actorId);
                members.assign(userId,orgId,request.positionIds());
                var member=members.require(userId,orgId,departmentId,false);
                audit.record(orgId,actorId,"MEMBER_APPOINTED",userId,member);
                compensation.complete(userId);
                return member;
            });
            return new CreatedMemberResponse(result,password,true);
        } catch(RuntimeException ex) {
            // A timed-out request may still finish in Identity. Keep the durable entry for the grace period.
            if (!(ex instanceof com.mems.exception.ApiException api &&
                    api.getStatus() == org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE))
                compensation.compensate(userId);
            throw ex;
        }
    }
    @Transactional
    public MemberResponse updatePositions(String departmentId,String userId,MemberPositionsRequest request) {
        policy.protectOwner(userId);
        departments.require(departmentId,actor.orgId(),true);
        var before=members.require(userId,actor.orgId(),departmentId,true);
        policy.check(departmentId,before.role(),request.positionIds());
        members.assign(userId,actor.orgId(),request.positionIds());
        var after=members.require(userId,actor.orgId(),departmentId,false);
        audit.record(actor.orgId(),actor.userId(),"MEMBER_POSITIONS_CHANGED",userId,Map.of("before",before,"after",after));
        return after;
    }
    @Transactional
    public void remove(String departmentId,String userId) {
        policy.protectOwner(userId);
        departments.require(departmentId,actor.orgId(),true);
        var before=members.require(userId,actor.orgId(),departmentId,true);
        policy.check(departmentId,before.role(),Set.of());
        if("OWNER".equals(before.role())) throw actor.forbidden("Owner appointments cannot be removed");
        members.delete(userId,actor.orgId());
        audit.record(actor.orgId(),actor.userId(),"MEMBER_REMOVED",userId,before);
    }
    private void validate(String departmentId,String role,Set<String> positions) {
        departments.require(departmentId,actor.orgId(),true);
        policy.check(departmentId,role,positions);
    }
}
