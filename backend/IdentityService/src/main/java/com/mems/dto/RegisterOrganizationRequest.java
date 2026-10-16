
package com.mems.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;


import java.util.Set;

import com.mems.entity.enums.OrgType;
 
public record RegisterOrganizationRequest(

    @NotBlank
    @Size(max = 200)
    String organizationName,

    @NotNull(message = "Organization type is required")
    OrgType orgType,

    @NotBlank
    @Size(min = 3, max = 100)
    String username,

    @NotBlank
    @Email
    @Size(max = 255)
    String email,

    @NotBlank
    @Size(min = 12)
    String password,

    @NotEmpty
    Set<@NotBlank String> modules
) {}
