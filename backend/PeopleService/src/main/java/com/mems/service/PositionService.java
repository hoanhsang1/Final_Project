package com.mems.service;
import com.mems.client.IdentityClient;
import com.mems.dto.*;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.DepartmentRepository;
import com.mems.repository.PositionRepository;
import com.mems.security.Actor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PositionService {
    private final PositionRepository repository;
    private final DepartmentRepository departments;
    private final Actor actor;
    private final IdentityClient identity;
    private final PeopleAuditService audit;
    private final DefaultPositionSeeder seeder;
    private final EffectivePermissionsService effectivePermissions;
    public PositionService(PositionRepository repository,DepartmentRepository departments,Actor actor,
            IdentityClient identity,PeopleAuditService audit,DefaultPositionSeeder seeder,
            EffectivePermissionsService effectivePermissions) {
        this.repository=repository;this.departments=departments;this.actor=actor;this.identity=identity;
        this.audit=audit;this.seeder=seeder;this.effectivePermissions=effectivePermissions;
    }
    public List<PermissionResponse> permissions() { return identity.permissions(); }
    public List<PermissionBundleResponse> bundles() { return identity.permissionBundles(); }
    @Transactional
    public List<PositionResponse> list() {
        String orgId=actor.orgId();
        seeder.ensureForOrg(orgId);
        return repository.list(orgId);
    }
    @Transactional
    public PositionResponse create(PositionRequest request) {
        validateRequest(request);
        requireWithinOwnPermissions(request);
        String orgId=actor.orgId(), id=UUID.randomUUID().toString();
        var result=repository.save(id,orgId,request,true);
        audit.record(orgId,actor.userId(),"POSITION_CREATED",id,request);
        return result;
    }
    @Transactional
    public PositionResponse update(String id,PositionRequest request) {
        validateRequest(request);
        String orgId=actor.orgId();
        var before=repository.require(id,orgId,true);
        requireWithinOwnPermissions(before.permissions(),before.bundleCodes(),
            request.scope(),request.departmentId());
        requireWithinOwnPermissions(request.permissions(),request.bundleCodes(),
            request.scope(),request.departmentId());
        var result=repository.save(id,orgId,request,false);
        audit.record(orgId,actor.userId(),"POSITION_UPDATED",id,Map.of("before",before,"after",result));
        return result;
    }
    @Transactional
    public void delete(String id) {
        String orgId=actor.orgId();
        var before=repository.require(id,orgId,true);
        requireWithinOwnPermissions(before.permissions(),before.bundleCodes(),
            before.scope(),before.departmentId());
        repository.delete(id,orgId);
        audit.record(orgId,actor.userId(),"POSITION_DELETED",id,before);
    }

    /** Số người đang giữ chức danh — FE cảnh báo khi gỡ quyền khỏi chức danh. */
    @Transactional(readOnly = true)
    public PositionImpactResponse impact(String id) {
        String orgId=actor.orgId();
        repository.require(id,orgId,false);
        return new PositionImpactResponse(repository.distinctHolders(orgId,List.of(id)));
    }

    /** Nhân bản chức danh sang phòng khác: loại quyền ngoài module phòng đích và trả danh sách bị loại. */
    @Transactional
    public PositionCloneResponse clone(String id, PositionCloneRequest request) {
        String orgId=actor.orgId();
        PositionResponse source=repository.require(id,orgId,false);
        DepartmentResponse target=departments.require(request.departmentId(),orgId,false);
        Set<String> available=availablePermissions(target);

        Set<String> kept=new TreeSet<>(), removed=new TreeSet<>();
        for (String permission : source.permissions()) {
            if (available.contains(permission)) kept.add(permission);
            else removed.add(permission);
        }

        Map<String,Set<String>> bundlePermissions=effectivePermissions.bundlePermissions();
        Set<String> keptBundles=new TreeSet<>(), droppedBundles=new TreeSet<>();
        for (String code : source.bundleCodes()) {
            Set<String> lost=bundlePermissions.getOrDefault(code,Set.of()).stream()
                .filter(permission -> !available.contains(permission))
                .collect(Collectors.toCollection(TreeSet::new));
            if (lost.isEmpty()) keptBundles.add(code);
            else { droppedBundles.add(code); removed.addAll(lost); }
        }

        String name=request.name()==null||request.name().isBlank()
            ? defaultCloneName(source.name()) : request.name().trim();
        PositionRequest payload=new PositionRequest(name,source.description(),kept,keptBundles,
            "DEPARTMENT",request.departmentId());
        validateRequest(payload);
        requireWithinOwnPermissions(payload);

        String newId=UUID.randomUUID().toString();
        PositionResponse created=repository.save(newId,orgId,payload,true);
        audit.record(orgId,actor.userId(),"POSITION_CLONED",newId,Map.of(
            "sourcePositionId",id,"departmentId",request.departmentId(),
            "removedPermissions",removed,"droppedBundles",droppedBundles));
        return new PositionCloneResponse(created,removed,droppedBundles);
    }

    private static String defaultCloneName(String sourceName) {
        String suffix=" (bản sao)";
        int max=200-suffix.length();
        String base=sourceName.length()>max ? sourceName.substring(0,max) : sourceName;
        return base+suffix;
    }

    private void validateRequest(PositionRequest request) {
        Set<String> validPermissions=identity.permissions().stream()
            .map(PermissionResponse::code).collect(Collectors.toSet());
        if (!validPermissions.containsAll(request.permissions()))
            throw new AppException(ErrorCode.UNKNOWN_PERMISSION);
        Set<String> validBundles=identity.permissionBundles().stream()
            .map(PermissionBundleResponse::code).collect(Collectors.toSet());
        if (!validBundles.containsAll(request.bundleCodes()))
            throw new AppException(ErrorCode.UNKNOWN_PERMISSION, "Unknown permission bundle code");
        if (!"ORGANIZATION".equals(request.scope()) && !"DEPARTMENT".equals(request.scope()))
            throw new AppException(ErrorCode.VALIDATION_ERROR, "scope must be ORGANIZATION or DEPARTMENT");
        if ("ORGANIZATION".equals(request.scope()) && request.departmentId()!=null)
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                "departmentId must be empty for an ORGANIZATION position");
        if ("ORGANIZATION".equals(request.scope()) && !actor.owner())
            throw actor.forbidden("Only the organization owner can manage ORGANIZATION-scope positions");

        DepartmentResponse department=null;
        if (request.departmentId()!=null)
            department=departments.require(request.departmentId(),actor.orgId(),false);

        if ("DEPARTMENT".equals(request.scope()) && department!=null) {
            Set<String> available=availablePermissions(department);
            for (String permission : request.permissions()) {
                if (!available.contains(permission)) throw outOfModule(permission);
            }
            Map<String,Set<String>> bundlePermissions=effectivePermissions.bundlePermissions();
            for (String code : request.bundleCodes()) {
                for (String permission : bundlePermissions.getOrDefault(code,Set.of())) {
                    if (!available.contains(permission)) throw outOfModule(permission);
                }
            }
        }
    }

    private AppException outOfModule(String permission) {
        return new AppException(ErrorCode.PERMISSION_OUT_OF_MODULE,
            "Permission is not available in this department's modules: " + permission);
    }

    /** Quyền khả dụng của phòng = quyền không gắn module + quyền thuộc module phòng đang bật. */
    private Set<String> availablePermissions(DepartmentResponse department) {
        Set<String> modules=new HashSet<>(department.modules());
        List<String> activeModules;
        try {
            activeModules=identity.activeModules(actor.orgId());
        } catch (AppException ex) {
            if (!"IDENTITY_UNAVAILABLE".equals(ex.getCode())) throw ex;
            activeModules=new ArrayList<>(modules);
        }
        Set<String> codes=new HashSet<>();
        for (PermissionResponse permission : identity.permissions()) {
            String module=permission.moduleCode();
            if (module==null||module.isBlank()
                || (modules.contains(module)&&activeModules.contains(module))) {
                codes.add(permission.code());
            }
        }
        return codes;
    }

    /** Rule 18: người không phải OWNER chỉ quản lý chức vụ trong phạm vi quyền của mình. */
    private void requireWithinOwnPermissions(PositionRequest request) {
        requireWithinOwnPermissions(request.permissions(),request.bundleCodes(),
            request.scope(),request.departmentId());
    }
    private void requireWithinOwnPermissions(Set<String> permissions,Set<String> bundleCodes,
            String scope,String departmentId) {
        if (actor.owner()) return;
        Set<String> all=new HashSet<>(permissions);
        Map<String,Set<String>> bundlePermissions=effectivePermissions.bundlePermissions();
        bundleCodes.forEach(code -> all.addAll(bundlePermissions.getOrDefault(code,Set.of())));
        for (String permission : all) {
            boolean allowed = "DEPARTMENT".equals(scope) && departmentId!=null
                ? actor.hasPermissionIn(permission,departmentId)
                : actor.hasPermission(permission);
            if (!allowed)
                throw actor.forbidden("Cannot manage a position with permissions beyond your own");
        }
    }
}
