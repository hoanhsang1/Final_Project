package com.mems.identity.repository;

import com.mems.identity.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AccountRepository extends JpaRepository<Account, UUID> {

    // Dùng cho US 1-1 (login): tìm theo org + username — khớp UNIQUE(org_id, username) trong schema
    Optional<Account> findByOrganization_IdAndUsername(UUID orgId, String username);

    boolean existsByOrganization_IdAndUsername(UUID orgId, String username);
}
