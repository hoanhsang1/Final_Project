package com.mems.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import com.mems.entity.Account;
import com.mems.entity.Organization;

import java.util.Optional;

public interface IOrganizationRepository extends Repository<Account, String> {

    @Query(
        value = "SELECT status FROM organization WHERE id = :orgId",
        nativeQuery = true
    )
    Optional<String> findOrganizationStatus(
        @Param("orgId") String orgId
    );

    void save(Organization organization);

    void saveAndFlush(Organization organization);
}