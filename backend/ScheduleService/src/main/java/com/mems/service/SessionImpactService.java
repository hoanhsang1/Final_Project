package com.mems.service;

import com.mems.dto.SessionImpactResponse;
import com.mems.inbox.SessionImpactRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Buổi học bị ảnh hưởng cần người có quyền xem và xử lý. */
@Service
public class SessionImpactService {
    private final SessionImpactRepository repository;

    public SessionImpactService(SessionImpactRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<SessionImpactResponse> list(String orgId, String departmentId, String status) {
        return repository.list(orgId, departmentId, status);
    }
}
