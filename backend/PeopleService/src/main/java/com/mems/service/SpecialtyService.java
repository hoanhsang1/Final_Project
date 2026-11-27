package com.mems.service;

import com.mems.dto.SpecialtyCreateRequest;
import com.mems.dto.SpecialtyResponse;
import com.mems.dto.SpecialtyUpdateRequest;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import com.mems.repository.SpecialtyRepository;
import com.mems.repository.SubjectRepository;
import com.mems.security.Actor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class SpecialtyService {
    private final SpecialtyRepository repository;
    private final SubjectRepository subjects;
    private final Actor actor;

    public SpecialtyService(SpecialtyRepository repository, SubjectRepository subjects, Actor actor) {
        this.repository = repository;
        this.subjects = subjects;
        this.actor = actor;
    }

    @Transactional(readOnly = true)
    public List<SpecialtyResponse> list(String q) {
        return repository.listActive(actor.orgId(), q);
    }

    @Transactional
    public SpecialtyResponse create(SpecialtyCreateRequest request) {
        String orgId = actor.orgId();
        String name = requireName(request.name());
        String unaccented = TextNormalizer.unaccent(name);
        if (repository.existsName(orgId, unaccented)) {
            throw duplicate();
        }
        String categoryId = resolveCategory(orgId, request.categoryId(), null);
        try {
            return repository.create(UUID.randomUUID().toString(), orgId, name, unaccented,
                categoryId, actor.userId());
        } catch (DuplicateKeyException ex) {
            throw duplicate();
        }
    }

    @Transactional
    public SpecialtyResponse update(String id, SpecialtyUpdateRequest request) {
        String orgId = actor.orgId();
        SpecialtyResponse current = repository.require(id, orgId);
        String name = requireName(request.name());
        String unaccented = TextNormalizer.unaccent(name);
        if (!unaccented.equals(TextNormalizer.unaccent(current.name()))
            && repository.existsName(orgId, unaccented)) {
            throw duplicate();
        }
        String categoryId = resolveCategory(orgId, request.categoryId(), current);
        try {
            return repository.update(id, orgId, name, unaccented, categoryId);
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

    private String requireName(String raw) {
        String name = raw == null ? "" : raw.trim();
        if (name.isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "name: must not be blank");
        }
        return name;
    }

    /** Danh mục phải cùng tổ chức và đang hoạt động; giữ nguyên danh mục cũ (dù đã ngừng) thì cho phép. */
    private String resolveCategory(String orgId, String categoryId, SpecialtyResponse current) {
        if (categoryId == null || categoryId.isBlank()) return null;
        String trimmed = categoryId.trim();
        if (current != null && trimmed.equals(current.categoryId())) return trimmed;
        if (subjects.activeCategoryName(orgId, trimmed) == null) {
            throw new AppException(ErrorCode.SUBJECT_CATEGORY_INVALID);
        }
        return trimmed;
    }

    private AppException duplicate() {
        return new AppException(ErrorCode.SPECIALTY_EXISTS);
    }
}
