package com.mems.dto;

import java.time.Instant;

/**
 * Một bước trong luồng chuyển phòng 4 bên.
 *
 * <p>{@code step}: SOURCE_HEAD | TARGET_HEAD | HR | EMPLOYEE.
 * {@code decision}: PENDING | APPROVED | REJECTED.</p>
 */
public record TransferStepResponse(
    String step,
    String decision,
    String decidedBy,
    String decidedByName,
    Instant decidedAt,
    String note
) {}
