package com.mems.service;
import com.mems.client.IdentityClient;
import com.mems.dto.*;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
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
    private final DelegationRepository delegations;
    private final SecureRandom random=new SecureRandom();
    public MemberService(DepartmentRepository departments,MemberRepository members,MembershipPolicy policy,
            IdentityClient identity,AccountCompensationService compensation,PeopleAuditService audit,Actor actor,
            StaffProfileRepository staff,TeacherRepository teachers,SpecialtyService specialties,
            PositionRepository positions,DelegationRepository delegations,PlatformTransactionManager manager) {
        this.departments=departments;this.members=members;this.policy=policy;this.identity=identity;
        this.compensation=compensation;this.audit=audit;this.actor=actor;
        this.staff=staff;this.teachers=teachers;this.specialties=specialties;this.positions=positions;
        this.delegations=delegations;
        this.tx=new TransactionTemplate(manager);this.tx.setTimeout(15);
    }
    @Transactional(readOnly=true)
    public List<MemberResponse> list(String departmentId) {
        policy.requirePermission(departmentId, "employee.view");
        departments.require(departmentId,actor.orgId(),false);
        return members.list(actor.orgId(),departmentId);
    }
    public CreatedMemberResponse create(String departmentId,MemberRequest request) {
        String orgId=actor.orgId(),actorId=actor.userId();
        MemberRequest resolved=withGeneratedStaffCode(request);
        tx.executeWithoutResult(status -> validate(departmentId,resolved));
        String userId=UUID.randomUUID().toString();
        byte[] bytes=new byte[24];random.nextBytes(bytes);
        String password=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        compensation.register(userId,orgId);
        try {
            identity.createAccount(userId,orgId,resolved,password,actorId);
            MemberResponse result=tx.execute(status -> {
                compensation.lock(userId);
                validate(departmentId,resolved);
                members.create(userId,orgId,departmentId,resolved.role(),actorId,resolved.username().trim());
                members.assign(userId,orgId,departmentId,resolved.positionIds(),actorId,"Tạo nhân viên");
                boolean teacher=persistProfile(userId,orgId,actorId,resolved);
                var member=members.require(userId,orgId,departmentId,false);
                audit.record(orgId,actorId,"MEMBER_APPOINTED",userId,member);
                if(teacher) audit.record(orgId,actorId,"TEACHER_CREATED",userId,teacherSnapshot(userId,orgId,resolved));
                compensation.complete(userId);
                return member;
            });
            return new CreatedMemberResponse(result,password,true);
        } catch(RuntimeException ex) {
            // A timed-out request may still finish in Identity. Keep the durable entry for the grace period.
            if (!(ex instanceof AppException api &&
                    api.getStatus() == HttpStatus.SERVICE_UNAVAILABLE))
                compensation.compensate(userId);
            throw ex;
        }
    }
    @Transactional
    public MemberResponse updatePositions(String departmentId,String userId,MemberPositionsRequest request) {
        policy.protectOwner(userId);
        // Quy tắc 3: không ai được tự nâng quyền bằng cách sửa chức danh của mình.
        if (!actor.owner() && actor.userId().equals(userId))
            throw new AppException(ErrorCode.SELF_ESCALATION_NOT_ALLOWED);
        departments.require(departmentId,actor.orgId(),true);
        var before=members.require(userId,actor.orgId(),departmentId,true);
        if(!"ACTIVE".equals(before.status())) throw new AppException(ErrorCode.MEMBER_NOT_ACTIVE);
        policy.check(departmentId,before.role(),request.positionIds());
        if(positions.profileTypes(actor.orgId(),request.positionIds()).contains("TEACHER")
                && !teachers.hasProfile(userId,actor.orgId()))
            throw invalid("positionIds","TEACHER position requires a teacher profile; use POST /teachers");
        members.assign(userId,actor.orgId(),departmentId,request.positionIds(),actor.userId(),
            trimToNull(request.reason()));
        var after=members.require(userId,actor.orgId(),departmentId,false);
        audit.record(actor.orgId(),actor.userId(),"MEMBER_POSITIONS_CHANGED",userId,Map.of("before",before,"after",after));
        return after;
    }

    @Transactional(readOnly = true)
    public MemberDetailResponse detail(String departmentId, String userId) {
        policy.requirePermission(departmentId, "employee.view");
        departments.require(departmentId, actor.orgId(), false);
        MemberDetailResponse detail = members.detail(userId, actor.orgId(), departmentId);
        if (policy.hasPermission(departmentId, "employee.view_detail")) return detail;
        return new MemberDetailResponse(detail.userId(), detail.username(), detail.departmentId(),
            detail.departmentName(), detail.role(), detail.status(), detail.appointedAt(),
            detail.appointedBy(), detail.staffCode(), detail.fullName(), null, null,
            detail.teacher(), detail.contractType(), detail.teachingStatus(), detail.positionIds(),
            detail.permissions(), detail.classCount(), detail.noClass(), detail.classLabel(),
            detail.assignmentHistory());
    }

    @Transactional(readOnly = true)
    public List<AssignmentHistoryResponse> assignmentHistory(String departmentId, String userId) {
        policy.requirePermission(departmentId, "employee.view");
        departments.require(departmentId, actor.orgId(), false);
        members.require(userId, actor.orgId(), departmentId, false);
        return members.assignmentHistory(userId, actor.orgId());
    }
    public ResetPasswordResponse resetPassword(String departmentId,String userId) {
        policy.protectOwner(userId);
        policy.requirePermission(departmentId, "employee.reset_password");
        departments.require(departmentId,actor.orgId(),false);
        var member=members.require(userId,actor.orgId(),departmentId,false);
        if("OWNER".equals(member.role())) throw actor.forbidden("Owner passwords cannot be reset here");
        if(!"ACTIVE".equals(member.status())) throw new AppException(ErrorCode.MEMBER_NOT_ACTIVE);
        String password=identity.resetPassword(userId,actor.orgId());
        audit.record(actor.orgId(),actor.userId(),"MEMBER_PASSWORD_RESET",userId,Map.of("role",member.role()));
        return new ResetPasswordResponse(password);
    }
    @Transactional
    public void remove(String departmentId,String userId) {
        policy.protectOwner(userId);
        departments.require(departmentId,actor.orgId(),true);
        var before=members.require(userId,actor.orgId(),departmentId,true);
        policy.requirePermission(departmentId, "employee.delete");
        if("OWNER".equals(before.role())) throw actor.forbidden("Owner appointments cannot be removed");
        String orgId=actor.orgId(),actorId=actor.userId();
        // Offboarding hợp nhất: không xoá cứng để giữ lịch sử và quyền đã cấp.
        members.offboard(userId,orgId,actorId,"Gỡ nhân sự");
        teachers.markResigned(userId,orgId);
        for (String delegationId : delegations.revokeAllForDelegate(orgId,userId,actorId,"Gỡ nhân sự")) {
            audit.record(orgId,actorId,"DELEGATION_REVOKED",delegationId,
                Map.of("reason","Gỡ nhân sự","delegateId",userId));
        }
        identity.disableAccount(userId,orgId);
        audit.record(orgId,actorId,"MEMBER_REMOVED",userId,before);
    }
    private void validate(String departmentId,MemberRequest request) {
        departments.require(departmentId,actor.orgId(),true);
        policy.requirePermission(departmentId, "employee.create");
        policy.check(departmentId,request.role(),request.positionIds());
        String orgId=actor.orgId();
        // Email là duy nhất trong toàn tổ chức, với MỌI nhân viên (không riêng giáo viên).
        if(staff.existsEmail(orgId,request.email().trim().toLowerCase(Locale.ROOT),""))
            throw new AppException(ErrorCode.EMAIL_EXISTS);
        if(!isTeacher(request)) return;

        String staffCode=requireText(request.staffCode(),"staffCode");
        requireText(request.fullName(),"fullName");
        requireText(request.phone(),"phone");
        if(request.teacherProfile()==null)
            throw invalid("teacherProfile","must not be null for a TEACHER position");
        specialties.validateIds(orgId,request.teacherProfile().specialtyIds());
        if(staff.existsCode(orgId,staffCode))
            throw new AppException(ErrorCode.STAFF_CODE_EXISTS);
    }
    private boolean isTeacher(MemberRequest request) {
        return positions.profileTypes(actor.orgId(),request.positionIds()).contains("TEACHER");
    }
    /** Mã nhân sự luôn do hệ thống sinh: GV cho giáo viên, NS cho nhân viên còn lại. */
    private MemberRequest withGeneratedStaffCode(MemberRequest request) {
        if(trimToNull(request.staffCode())!=null) return request;
        String prefix=isTeacher(request)?"GV":"NS";
        return new MemberRequest(request.username(),request.email(),request.role(),request.positionIds(),
            staff.nextStaffCode(actor.orgId(),prefix),request.fullName(),request.phone(),
            request.teacherProfile());
    }
    private boolean persistProfile(String userId,String orgId,String actorId,MemberRequest request) {
        boolean teacher=isTeacher(request);
        String staffCode=trimToNull(request.staffCode());
        if(staffCode==null) staffCode=staff.nextStaffCode(orgId,teacher?"GV":"NS");
        String fullName=trimToNull(request.fullName());
        if(fullName==null) fullName=request.username().trim();
        try {
            staff.create(userId,orgId,staffCode,fullName,trimToNull(request.phone()),
                request.email().trim().toLowerCase(Locale.ROOT),actorId);
        } catch(DuplicateKeyException ex) {
            throw new AppException(ErrorCode.STAFF_CODE_EXISTS);
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
    private AppException invalid(String field,String message) {
        return new AppException(ErrorCode.VALIDATION_ERROR, field + ": " + message);
    }
}
