package com.mems.repository;

import com.mems.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface IAccountRepository extends JpaRepository<Account, String> {

    Optional<Account> findByUsername(String username);

    @Query(value = """
        SELECT r.code
        FROM role r
        JOIN account_role ar ON ar.role_id = r.id
        WHERE ar.account_id = :accountId
        """, nativeQuery = true)
    List<String> findRoleCodesByAccountId(
        @Param("accountId") String accountId
    );

    Boolean existsByUsername(String username);
}