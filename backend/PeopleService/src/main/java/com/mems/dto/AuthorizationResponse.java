package com.mems.dto;
import java.util.Set;
public record AuthorizationResponse(String role,String departmentId,Set<String> permissions) {}
