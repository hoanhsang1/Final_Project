package com.mems.dto;

public record CreatedTeacherResponse(
    String userId,
    String staffCode,
    String fullName,
    String temporaryPassword,
    boolean mustChangePassword
) {}
