package com.mems.service;

import com.mems.dto.RegisterOrganizationRequest;
import com.mems.entity.Organization;
import com.mems.entity.enums.OrganizationStatus;
import com.mems.exception.ApiException;
import com.mems.repository.IAccountRepository;
import com.mems.repository.IModuleRepository;
import com.mems.repository.IOrganizationRepository;
import com.mems.service.impl.IIdentityService;
import com.mems.service.impl.IOrganizationRegistrationService;
import com.mems.entity.enums.OrgType;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service 
public class OrganizationRegistrationService implements IOrganizationRegistrationService{
    

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    private final IAccountRepository accountRepository;
    private final IModuleRepository moduleRepository;
    private final IOrganizationRepository organizationRepository;

    public OrganizationRegistrationService(
            JdbcTemplate jdbc,
            PasswordEncoder passwordEncoder,
            IAccountRepository accountRepository,
            IModuleRepository moduleRepository,
            IOrganizationRepository organizationRepository
    ) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
        this.accountRepository = accountRepository;
        this.moduleRepository = moduleRepository;
        this.organizationRepository = organizationRepository;
    }

    @Transactional 
    public Map<String, Object> register (
        RegisterOrganizationRequest request
    ) {
        String username = request.username().trim();
        String email = request.email().trim();
        String orgName = request.organizationName().trim();
        Set<String> modules = request.modules();

        //kiểm tra username có tồn tại
        boolean exist = accountRepository.existsByUsername(username);
        
        if(exist) {
            throw new ApiException(
                HttpStatus.CONFLICT,
                "Username already exists"
            );
        }

        // 2. Kiem tra tat ca module co hop le khong
        modules.forEach(module -> {
            boolean exists = moduleRepository.existsByCodeAndActiveTrue(module);

            if (!exists) {
                throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid module: " + module
                );
            }
        });

        // 3. Lay role ORG_OWNER
        var roleIds = jdbc.queryForList(
            "SELECT id FROM role WHERE code = ? AND scope = ?",
            Long.class,
            "ORG_OWNER",
            "organization"
        );

        if (roleIds.isEmpty()) {
            throw new IllegalStateException(
                "Role ORG_OWNER has not been configured"
            );
        }

        Long ownerRoleId = roleIds.get(0);


        // 4. Tao ID
        String orgId = UUID.randomUUID().toString();
        String accountId = UUID.randomUUID().toString();

        // 5. Tao organization: pending
        Organization organization = new Organization();
        organization.setId(orgId);
        organization.setName(orgName);
        organization.setOrgType(request.orgType());
        organization.setStatus(OrganizationStatus.PENDING);

        organizationRepository.saveAndFlush(organization);

        // 6. Tao account chu to chuc: pending
        jdbc.update(
            """
            INSERT INTO account
                (id, org_id, username, email,
                 password_hash, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
            """,
            accountId,
            orgId,
            username,
            email,
            passwordEncoder.encode(request.password())
        );

        // 7. Gan role ORG_OWNER
        jdbc.update(
            """
            INSERT INTO account_role
                (account_id, role_id)
            VALUES (?, ?)
            """,
            accountId,
            ownerRoleId
        );

        // 8. Luu module duoc yeu cau
        for (String moduleCode : modules) {
            jdbc.update(
                """
                INSERT INTO organization_module
                    (org_id, module_code, status)
                VALUES (?, ?, 'requested')
                """,
                orgId,
                moduleCode
            );
        }

        // 9. Tra ket qua, khong tra password/hash
        return Map.of(
            "organizationId", orgId,
            "accountId", accountId,
            "organizationStatus", "PENDING",
            "accountStatus", "PENDING",
            "requestedModules", modules
        );

    }
}
