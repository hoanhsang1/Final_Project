package com.mems.dto;

import java.util.List;

/**
 * Hộp duyệt hợp nhất của chính người dùng: chỉ chứa các mục mà policy backend
 * xác nhận người đó có thẩm quyền xử lý. Không phụ thuộc quyền xem toàn bộ
 * danh sách nhân sự/phòng ban.
 */
public record ApprovalInboxResponse(
    List<TransferResponse> transfers,
    List<ResignationResponse> resignations,
    List<ClassLifecycleInboxItem> classLifecycle,
    int total
) {}
