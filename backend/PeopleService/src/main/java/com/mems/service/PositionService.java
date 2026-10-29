package com.mems.service;
import com.mems.client.IdentityClient;
import com.mems.dto.*;
import com.mems.exception.ApiException;
import com.mems.repository.PositionRepository;
import com.mems.security.Actor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PositionService {
    private final PositionRepository repository;
    private final Actor actor;
    private final IdentityClient identity;
    private final PeopleAuditService audit;
    public PositionService(PositionRepository repository,Actor actor,IdentityClient identity,PeopleAuditService audit) {
        this.repository=repository;this.actor=actor;this.identity=identity;this.audit=audit;
    }
    public List<PermissionResponse> permissions() { return identity.permissions(); }
    @Transactional(readOnly=true)
    public List<PositionResponse> list() { return repository.list(actor.orgId()); }
    @Transactional
    public PositionResponse create(PositionRequest request) {
        validatePermissions(request);
        String orgId=actor.orgId(), id=UUID.randomUUID().toString();
        var result=repository.save(id,orgId,request,true);
        audit.record(orgId,actor.userId(),"POSITION_CREATED",id,request);
        return result;
    }
    @Transactional
    public PositionResponse update(String id,PositionRequest request) {
        validatePermissions(request);
        String orgId=actor.orgId();
        var before=repository.require(id,orgId,true);
        var result=repository.save(id,orgId,request,false);
        audit.record(orgId,actor.userId(),"POSITION_UPDATED",id,Map.of("before",before,"after",result));
        return result;
    }
    @Transactional
    public void delete(String id) {
        String orgId=actor.orgId();
        var before=repository.require(id,orgId,true);
        repository.delete(id,orgId);
        audit.record(orgId,actor.userId(),"POSITION_DELETED",id,before);
    }
    private void validatePermissions(PositionRequest request) {
        var valid=identity.permissions().stream().map(PermissionResponse::code).collect(Collectors.toSet());
        if (!valid.containsAll(request.permissions()))
            throw new ApiException(HttpStatus.BAD_REQUEST,"UNKNOWN_PERMISSION","Unknown permission code");
    }
}
