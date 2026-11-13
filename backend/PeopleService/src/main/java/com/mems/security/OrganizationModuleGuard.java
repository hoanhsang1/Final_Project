package com.mems.security;

import com.mems.client.IdentityClient;
import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class OrganizationModuleGuard {
    private final IdentityClient identityClient;

    public OrganizationModuleGuard(IdentityClient identityClient) {
        this.identityClient = identityClient;
    }

    public void requireModule(String orgId, String moduleCode) {
        if (!isActive(orgId, moduleCode)) {
            throw new AppException(ErrorCode.MODULE_NOT_ENABLED,
                "Module " + moduleCode + " is not enabled for organization");
        }
    }

    public boolean isActive(String orgId, String moduleCode) {
        List<String> activeModules = identityClient.activeModules(orgId);
        return activeModules != null && activeModules.contains(moduleCode);
    }
}

