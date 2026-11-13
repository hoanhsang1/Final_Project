package com.mems.service;

import com.mems.dto.SpecialtyCreateRequest;
import com.mems.dto.SpecialtyResponse;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.SpecialtyRepository;
import com.mems.security.Actor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class SpecialtyService {
    private final SpecialtyRepository repository;
    private final Actor actor;

    public SpecialtyService(SpecialtyRepository repository, Actor actor) {
        this.repository = repository;
        this.actor = actor;
    }

    @Transactional(readOnly = true)
    public List<SpecialtyResponse> list(String q) {
        return repository.listActive(actor.orgId(), q);
    }

    @Transactional
    public SpecialtyResponse create(SpecialtyCreateRequest request) {
        String orgId = actor.orgId();
        String name = request.name().trim();
        if (name.isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "name: must not be blank");
        }
        String unaccented = TextNormalizer.unaccent(name);
        if (repository.existsName(orgId, unaccented)) {
            throw duplicate();
        }
        try {
            return repository.create(UUID.randomUUID().toString(), orgId, name, unaccented, actor.userId());
        } catch (DuplicateKeyException ex) {
            throw duplicate();
        }
    }

    public List<SpecialtyResponse> validateIds(String orgId, Collection<String> ids) {
        Set<String> requested = new HashSet<>(ids);
        List<SpecialtyResponse> found = repository.findActiveByIds(orgId, requested);
        if (found.size() != requested.size()) {
            throw new AppException(ErrorCode.INVALID_SPECIALTY);
        }
        return found;
    }

    private AppException duplicate() {
        return new AppException(ErrorCode.SPECIALTY_EXISTS);
    }
}
