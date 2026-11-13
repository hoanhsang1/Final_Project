package com.mems.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;


import java.util.Set;

import com.mems.entity.enums.OrgType;

public record RegisterOrganizationRequest(

    @NotBlank(message = "ORGANIZATION_NAME_REQUIRED")
    @Size(max = 200, message = "ORGANIZATION_NAME_TOO_LONG")
    String organizationName,

    @NotNull(message = "ORGANIZATION_TYPE_REQUIRED")
    OrgType orgType,

    @NotBlank(message = "USERNAME_REQUIRED")
    @Size(min = 3, max = 100, message = "REGISTER_USERNAME_INVALID")
    String username,

    @NotBlank(message = "EMAIL_REQUIRED")
    @Email(message = "EMAIL_INVALID")
    @Size(max = 255, message = "EMAIL_TOO_LONG")
    String email,

    @NotBlank(message = "PASSWORD_REQUIRED")
    @Size(min = 12, message = "REGISTER_PASSWORD_TOO_SHORT")
    String password,

    @NotEmpty(message = "MODULES_REQUIRED")
    Set<@NotBlank(message = "MODULE_CODE_REQUIRED") String> modules
) {}
