package com.mems.dto;

import java.util.Set;

/**
 * Kết quả nhân bản chức danh: chức danh mới + quyền/bundle bị loại vì ngoài
 * module (hoặc phạm vi) của phòng đích.
 */
public record PositionCloneResponse(
    PositionResponse position,
    Set<String> removedPermissions,
    Set<String> droppedBundles
) {}
