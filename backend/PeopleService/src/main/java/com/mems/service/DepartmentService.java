package com.mems.service;
import com.mems.dto.*;
import com.mems.repository.DepartmentRepository;
import com.mems.security.Actor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class DepartmentService {
    private final DepartmentRepository repository;
    private final Actor actor;
    public DepartmentService(DepartmentRepository repository,Actor actor) { this.repository=repository; this.actor=actor; }
    @Transactional(readOnly=true)
    public List<DepartmentResponse> list() {
        return repository.list(actor.orgId(),actor.jwt().getClaimAsString("departmentId"),actor.owner());
    }
    @Transactional
    public DepartmentResponse create(DepartmentRequest request) {
        return repository.create(actor.orgId(),request.name().trim(),request.description());
    }
    @Transactional
    public DepartmentResponse update(String id,DepartmentRequest request) {
        String orgId=actor.orgId();
        repository.require(id,orgId,true);
        return repository.update(id,orgId,request.name().trim(),request.description());
    }
    @Transactional
    public void delete(String id) {
        String orgId=actor.orgId();
        repository.require(id,orgId,true);
        repository.delete(id,orgId);
    }
}
