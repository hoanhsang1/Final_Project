package com.mems.service;
import com.mems.client.IdentityClient;
import com.mems.dto.*;
import com.mems.exception.ApiException;
import com.mems.repository.*;
import com.mems.security.Actor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
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
    private final StaffProfileRepository staff;
    private final TeacherRepository teachers;
    private final SpecialtyService specialties;
    private final PositionRepository positions;
    private final SecureRandom random=new SecureRandom();
    public MemberService(DepartmentRepository departments,MemberRepository members,MembershipPolicy policy,
            IdentityClient identity,AccountCompensationService compensation,PeopleAuditService audit,Actor actor,
            StaffProfileRepository staff,TeacherRepository teachers,SpecialtyService specialties,
            PositionRepository positions,PlatformTransactionManager manager) {
        this.departments=departments;this.members=members;this.policy=policy;this.identity=identity;
        this.compensation=compensation;this.audit=audit;this.actor=actor;
        this.staff=staff;this.teachers=teachers;this.specialties=specialties;this.positions=positions;
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
        tx.executeWithoutResult(status -> validate(departmentId,request));
        String userId=UUID.randomUUID().toString();
        byte[] bytes=new byte[24];random.nextBytes(bytes);
        String password=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        compensation.register(userId,orgId);
        try {
            identity.createAccount(userId,orgId,request,password,actorId);
            MemberResponse result=tx.execute(status -> {
                compensation.lock(userId);
                validate(departmentId,request);
                members.create(userId,orgId,departmentId,request.role(),actorId,request.username().trim());
                members.assign(userId,orgId,request.positionIds());
                boolean teacher=persistProfile(userId,orgId,actorId,request);
                var member=members.require(userId,orgId,departmentId,false);
                audit.record(orgId,actorId,"MEMBER_APPOINTED",userId,member);
                if(teacher) audit.record(orgId,actorId,"TEACHER_CREATED",userId,teacherSnapshot(userId,orgId,request));
                compensation.complete(userId);
                return member;
            });
            return new CreatedMemberResponse(result,password,true);
        } catch(RuntimeException ex) {
            // A timed-out request may still finish in Identity. Keep the durable entry for the grace period.
            if (!(ex instanceof ApiException api &&
                    api.getStatus() == HttpStatus.SERVICE_UNAVAILABLE))
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
        if(positions.profileTypes(actor.orgId(),request.positionIds()).contains("TEACHER")
                && !teachers.hasProfile(userId,actor.orgId()))
            throw invalid("positionIds","TEACHER position requires a teacher profile; use POST /teachers");
        members.assign(userId,actor.orgId(),request.positionIds());
        var after=members.require(userId,actor.orgId(),departmentId,false);
        audit.record(actor.orgId(),actor.userId(),"MEMBER_POSITIONS_CHANGED",userId,Map.of("before",before,"after",after));
        return after;
    }
    public ResetPasswordResponse resetPassword(String departmentId,String userId) {
        policy.protectOwner(userId);
        departments.require(departmentId,actor.orgId(),false);
        var member=members.require(userId,actor.orgId(),departmentId,false);
        if("OWNER".equals(member.role())) throw actor.forbidden("Owner passwords cannot be reset here");
        String password=identity.resetPassword(userId,actor.orgId());
        audit.record(actor.orgId(),actor.userId(),"MEMBER_PASSWORD_RESET",userId,Map.of("role",member.role()));
        return new ResetPasswordResponse(password);
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
    private void validate(String departmentId,MemberRequest request) {
        departments.require(departmentId,actor.orgId(),true);
        policy.check(departmentId,request.role(),request.positionIds());
        if(!isTeacher(request)) return;

        String staffCode=requireText(request.staffCode(),"staffCode");
        requireText(request.fullName(),"fullName");
        requireText(request.phone(),"phone");
        if(request.teacherProfile()==null)
            throw invalid("teacherProfile","must not be null for a TEACHER position");
        String orgId=actor.orgId();
        specialties.validateIds(orgId,request.teacherProfile().specialtyIds());
        if(staff.existsCode(orgId,staffCode))
            throw new ApiException(HttpStatus.CONFLICT,"STAFF_CODE_EXISTS","Staff code already exists in organization");
        if(staff.existsEmail(orgId,request.email().trim().toLowerCase(Locale.ROOT),""))
            throw new ApiException(HttpStatus.CONFLICT,"EMAIL_EXISTS","Email already exists in organization");
    }
    private boolean isTeacher(MemberRequest request) {
        return positions.profileTypes(actor.orgId(),request.positionIds()).contains("TEACHER");
    }
    private boolean persistProfile(String userId,String orgId,String actorId,MemberRequest request) {
        boolean teacher=isTeacher(request);
        String staffCode=trimToNull(request.staffCode());
        if(staffCode==null) staffCode=request.username().trim();
        if(!teacher && staff.existsCode(orgId,staffCode)) staffCode="STAFF-"+userId.substring(0,8);
        String fullName=trimToNull(request.fullName());
        if(fullName==null) fullName=request.username().trim();
        try {
            staff.create(userId,orgId,staffCode,fullName,trimToNull(request.phone()),
                request.email().trim().toLowerCase(Locale.ROOT),actorId);
        } catch(DuplicateKeyException ex) {
            throw new ApiException(HttpStatus.CONFLICT,"STAFF_CODE_EXISTS","Staff code already exists in organization");
        }
        if(teacher) {
            teachers.createProfile(userId,orgId,request.teacherProfile().contractType(),actorId);
            teachers.replaceSpecialties(userId,orgId,request.teacherProfile().specialtyIds());
        }
        return teacher;
    }
    private Map<String,Object> teacherSnapshot(String userId,String orgId,MemberRequest request) {
        var saved=staff.find(userId,orgId).orElseThrow();
        Map<String,Object> details=new LinkedHashMap<>();
        details.put("staffCode",saved.staffCode());
        details.put("fullName",saved.fullName());
        details.put("email",saved.email());
        details.put("phone",saved.phone());
        details.put("contractType",request.teacherProfile().contractType());
        details.put("specialtyIds",new TreeSet<>(request.teacherProfile().specialtyIds()));
        return details;
    }
    private String requireText(String value,String field) {
        String trimmed=trimToNull(value);
        if(trimmed==null) throw invalid(field,"must not be blank for a TEACHER position");
        return trimmed;
    }
    private String trimToNull(String value) {
        if(value==null) return null;
        String trimmed=value.trim();
        return trimmed.isEmpty()?null:trimmed;
    }
    private ApiException invalid(String field,String message) {
        return new ApiException(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR",field+": "+message);
    }
}
