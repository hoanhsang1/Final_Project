package com.mems.security;

import com.mems.client.IdentityClient;
import com.mems.exception.ApiException;
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
        List<String> activeModules = identityClient.activeModules(orgId);
        if (activeModules == null || !activeModules.contains(moduleCode)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MODULE_NOT_ENABLED",
                "Module " + moduleCode + " is not enabled for organization");
        }
    }
}

