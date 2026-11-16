package com.mems.service;

import com.mems.client.IdentityClient;
import com.mems.dto.DepartmentModuleImpactResponse;
import com.mems.dto.DepartmentRequest;
import com.mems.dto.DepartmentResponse;
import com.mems.dto.PermissionBundleResponse;
import com.mems.dto.PermissionResponse;
import com.mems.dto.PositionResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.DepartmentRepository;
import com.mems.repository.PositionRepository;
import com.mems.security.Actor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class DepartmentService {
    private static final Logger log = LoggerFactory.getLogger(DepartmentService.class);

    // Fallback khi IdentityService không phản hồi: đúng các module đang gate quyền.
    private static final Set<String> FALLBACK_PERMISSION_MODULES =
        Set.of("STUDENT_MANAGEMENT", "SCHEDULE_MANAGEMENT", "FACILITY_MANAGEMENT");

    private final DepartmentRepository repository;
    private final PositionRepository positions;
    private final Actor actor;
    private final IdentityClient identityClient;
    private final PeopleAuditService audit;
    private final DefaultPositionSeeder positionSeeder;

    public DepartmentService(DepartmentRepository repository, PositionRepository positions, Actor actor,
                             IdentityClient identityClient, PeopleAuditService audit,
                             DefaultPositionSeeder positionSeeder) {
        this.repository = repository;
        this.positions = positions;
        this.actor = actor;
        this.identityClient = identityClient;
        this.audit = audit;
        this.positionSeeder = positionSeeder;
    }

    @Transactional(readOnly = true)
    public List<DepartmentResponse> list() {
        return repository.list(actor.orgId(), actor.jwt().getClaimAsString("departmentId"), actor.owner());
    }

    /** Danh mục phòng ban để nhân sự chọn đích khi tự xin điều chuyển (không cần quyền quản lý). */
    @Transactional(readOnly = true)
    public List<DepartmentResponse> transferTargets() {
        return repository.list(actor.orgId(), null, true);
    }

    @Transactional(readOnly = true)
    public DepartmentResponse get(String id) {
        actor.requirePermissionIn("department.view", id);
        return repository.require(id, actor.orgId(), false);
    }

    /** Quyền khả dụng của phòng = quyền không gắn module + quyền thuộc module phòng đang phục vụ. */
    @Transactional(readOnly = true)
    public List<PermissionResponse> availablePermissions(String id) {
        actor.requirePermissionIn("department.view", id);
        DepartmentResponse department = repository.require(id, actor.orgId(), false);
        Set<String> modules = new HashSet<>(department.modules());
        List<String> activeModules = activeModulesOrFailOpen(actor.orgId());
        return identityClient.permissions().stream()
            .filter(permission -> isAvailable(permission.moduleCode(), modules, activeModules))
            .toList();
    }

    /** Cảnh báo trước khi gỡ module: chức danh/quyền nào sẽ mất hiệu lực. Không sửa dữ liệu. */
    @Transactional(readOnly = true)
    public DepartmentModuleImpactResponse moduleImpact(String id, List<String> requestedModules) {
        actor.requirePermission("department.manage");
        DepartmentResponse department = repository.require(id, actor.orgId(), false);
        Set<String> requested = requestedModules == null ? Set.of() : new HashSet<>(requestedModules);
        List<String> removed = department.modules().stream()
            .filter(module -> !requested.contains(module))
            .sorted()
            .toList();
        if (removed.isEmpty()) {
            return new DepartmentModuleImpactResponse(List.of(), List.of(), 0);
        }

        Map<String, String> permissionModules = new HashMap<>();
        identityClient.permissions().forEach(p -> permissionModules.put(p.code(), p.moduleCode()));
        Map<String, Set<String>> bundles = new HashMap<>();
        for (PermissionBundleResponse bundle : identityClient.permissionBundles()) {
            bundles.put(bundle.code(), new HashSet<>(bundle.permissions()));
        }

        List<DepartmentModuleImpactResponse.ImpactedPosition> impacted = new ArrayList<>();
        List<String> impactedIds = new ArrayList<>();
        for (PositionResponse position : positions.listByDepartment(actor.orgId(), id)) {
            Set<String> raw = new TreeSet<>(position.permissions());
            position.bundleCodes().forEach(code -> raw.addAll(bundles.getOrDefault(code, Set.of())));
            Set<String> lost = new TreeSet<>();
            for (String permission : raw) {
                String module = permissionModules.get(permission);
                if (module != null && removed.contains(module)) lost.add(permission);
            }
            if (!lost.isEmpty()) {
                impacted.add(new DepartmentModuleImpactResponse.ImpactedPosition(
                    position.id(), position.name(), lost,
                    positions.distinctHolders(actor.orgId(), List.of(position.id()))));
                impactedIds.add(position.id());
            }
        }
        int holders = positions.distinctHolders(actor.orgId(), impactedIds);
        return new DepartmentModuleImpactResponse(removed, impacted, holders);
    }

    @Transactional
    public DepartmentResponse create(DepartmentRequest request) {
        actor.requirePermission("department.manage");
        String orgId = actor.orgId();
        validateModules(orgId, request.moduleCodes());

        DepartmentResponse created = repository.create(orgId, request.name().trim(), request.description());
        positionSeeder.ensureForOrg(orgId);
        repository.setModules(created.id(), orgId, request.moduleCodes());

        audit.record(orgId, actor.userId(), "DEPARTMENT_MODULES_CHANGED", created.id(),
            Map.of("before", List.of(), "after", request.moduleCodes() != null ? request.moduleCodes() : List.of()));

        return repository.require(created.id(), orgId, false);
    }

    @Transactional
    public DepartmentResponse update(String id, DepartmentRequest request) {
        actor.requirePermission("department.manage");
        String orgId = actor.orgId();
        validateModules(orgId, request.moduleCodes());

        DepartmentResponse before = repository.require(id, orgId, true);
        repository.update(id, orgId, request.name().trim(), request.description());
        repository.setModules(id, orgId, request.moduleCodes());

        audit.record(orgId, actor.userId(), "DEPARTMENT_MODULES_CHANGED", id,
            Map.of("before", before.modules(), "after", request.moduleCodes() != null ? request.moduleCodes() : List.of()));

        return repository.require(id, orgId, false);
    }

    @Transactional
    public void delete(String id) {
        actor.requirePermission("department.manage");
        String orgId = actor.orgId();
        repository.require(id, orgId, true);
        repository.delete(id, orgId);
    }

    private static boolean isAvailable(String moduleCode, Set<String> departmentModules,
                                       List<String> activeModules) {
        if (moduleCode == null || moduleCode.isBlank()) return true;
        return departmentModules.contains(moduleCode) && activeModules.contains(moduleCode);
    }

    private Set<String> permissionModules() {
        try {
            Set<String> codes = new HashSet<>();
            identityClient.permissions().stream()
                .map(PermissionResponse::moduleCode)
                .filter(code -> code != null && !code.isBlank())
                .forEach(codes::add);
            return codes.isEmpty() ? FALLBACK_PERMISSION_MODULES : codes;
        } catch (AppException ex) {
            if (!"IDENTITY_UNAVAILABLE".equals(ex.getCode())) throw ex;
            log.warn("IdentityService unavailable ({}), using fallback module catalog", ex.getMessage());
            return FALLBACK_PERMISSION_MODULES;
        }
    }

    private List<String> activeModulesOrFailOpen(String orgId) {
        try {
            return identityClient.activeModules(orgId);
        } catch (AppException ex) {
            if (!"IDENTITY_UNAVAILABLE".equals(ex.getCode())) throw ex;
            log.warn("IdentityService unavailable ({}), skipping active-module check for org={}",
                ex.getMessage(), orgId);
            return new ArrayList<>(permissionModules());
        }
    }

    private void validateModules(String orgId, List<String> moduleCodes) {
        if (moduleCodes == null || moduleCodes.isEmpty()) {
            return;
        }
        Set<String> allowed = permissionModules();
        for (String code : moduleCodes) {
            if (!allowed.contains(code)) {
                throw new AppException(ErrorCode.MODULE_NOT_ENABLED, "Module not permitted: " + code);
            }
        }
        // Identity down => fail-open, module đã được kiểm tra thuộc catalog ở trên.
        List<String> activeModules = activeModulesOrFailOpen(orgId);
        for (String code : moduleCodes) {
            if (!activeModules.contains(code)) {
                throw new AppException(ErrorCode.MODULE_NOT_ENABLED, "Module not enabled for organization: " + code);
            }
        }
    }
}
