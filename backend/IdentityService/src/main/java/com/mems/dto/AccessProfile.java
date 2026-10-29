package com.mems.dto;
import java.util.Set;
public record AccessProfile(String role,String departmentId,Set<String> permissions) {}
