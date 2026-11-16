package com.mems.dto;

public record StudentAccountResponse(
    String studentId,
    String username,
    String temporaryPassword
) {}
