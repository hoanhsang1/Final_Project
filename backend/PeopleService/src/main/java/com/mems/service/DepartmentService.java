package com.mems.service;

import com.mems.client.IdentityClient;
import com.mems.dto.DepartmentRequest;
import com.mems.dto.DepartmentResponse;
import com.mems.exception.ApiException;
import com.mems.repository.DepartmentRepository;
import com.mems.security.Actor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class DepartmentService {
    private static final Set<String> ALLOWED_MODULES = Set.of("STUDENT_MANAGEMENT");

    private final DepartmentRepository repository;
    private final Actor actor;
    private final IdentityClient identityClient;
    private final PeopleAuditService audit;

    public DepartmentService(DepartmentRepository repository, Actor actor, IdentityClient identityClient, PeopleAuditService audit) {
        this.repository = repository;
        this.actor = actor;
        this.identityClient = identityClient;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<DepartmentResponse> list() {
        return repository.list(actor.orgId(), actor.jwt().getClaimAsString("departmentId"), actor.owner());
    }

    @Transactional(readOnly = true)
    public DepartmentResponse get(String id) {
        actor.requireDepartment(id);
        return repository.require(id, actor.orgId(), false);
    }

    @Transactional
    public DepartmentResponse create(DepartmentRequest request) {
        String orgId = actor.orgId();
        validateModules(orgId, request.moduleCodes());

        DepartmentResponse created = repository.create(orgId, request.name().trim(), request.description());
        repository.setModules(created.id(), orgId, request.moduleCodes());

        audit.record(orgId, actor.userId(), "DEPARTMENT_MODULES_CHANGED", created.id(),
            Map.of("before", List.of(), "after", request.moduleCodes() != null ? request.moduleCodes() : List.of()));

        return repository.require(created.id(), orgId, false);
    }

    @Transactional
    public DepartmentResponse update(String id, DepartmentRequest request) {
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
        String orgId = actor.orgId();
        repository.require(id, orgId, true);
        repository.delete(id, orgId);
    }

    private void validateModules(String orgId, List<String> moduleCodes) {
        if (moduleCodes == null || moduleCodes.isEmpty()) {
            return;
        }
        for (String code : moduleCodes) {
            if (!ALLOWED_MODULES.contains(code)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "MODULE_NOT_ENABLED", "Module not permitted: " + code);
            }
        }
        List<String> activeModules = identityClient.activeModules(orgId);
        for (String code : moduleCodes) {
            if (!activeModules.contains(code)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "MODULE_NOT_ENABLED", "Module not enabled for organization: " + code);
            }
        }
    }
}
