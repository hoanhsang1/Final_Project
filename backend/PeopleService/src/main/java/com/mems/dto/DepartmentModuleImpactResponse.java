package com.mems.dto;

import java.util.List;
import java.util.Set;

/**
 * Cảnh báo khi Owner gỡ module khỏi phòng ban: liệt kê chức danh đang giữ quyền
 * thuộc module bị gỡ và số người đang được gán. Không tự xoá quyền nào.
 */
public record DepartmentModuleImpactResponse(
    List<String> removedModules,
    List<ImpactedPosition> positions,
    int affectedMembers
) {
    public record ImpactedPosition(String id, String name, Set<String> permissions, int members) {}
}
