package com.mems.dto;

/**
 * Khả năng duyệt của chính người dùng theo policy (không phải theo mã quyền).
 * FE dùng để hiện/ẩn menu "Việc chờ duyệt" và các nút quyết định.
 */
public record ApprovalCapabilitiesResponse(boolean transfer, boolean resignation,
                                           boolean classLifecycle, boolean any) {
}
