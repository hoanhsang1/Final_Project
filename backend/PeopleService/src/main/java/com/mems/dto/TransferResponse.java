package com.mems.dto;

import java.time.Instant;
import java.util.List;

/**
 * Yêu cầu chuyển phòng ban.
 *
 * <p>{@code actionableSteps} chỉ được nạp cho hộp duyệt của người gọi: các bước
 * còn PENDING mà chính người đó được phép quyết định. Danh sách lịch sử để rỗng.</p>
 */
public record TransferResponse(
    String id,
    String userId,
    String username,
    String fullName,
    String fromDepartmentId,
    String fromDepartmentName,
    String toDepartmentId,
    String toDepartmentName,
    String reason,
    String status,
    String requestedBy,
    String requestedByName,
    Instant requestedAt,
    Instant appliedAt,
    String appliedBy,
    List<TransferStepResponse> steps,
    List<String> actionableSteps
) {
    public TransferResponse withActionableSteps(List<String> steps) {
        return new TransferResponse(id, userId, username, fullName,
            fromDepartmentId, fromDepartmentName, toDepartmentId, toDepartmentName,
            reason, status, requestedBy, requestedByName, requestedAt, appliedAt, appliedBy,
            this.steps, steps);
    }
}
