package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Sửa chuyên môn. {@code categoryId} null nghĩa là bỏ gán danh mục (PUT thay thế toàn bộ).
 */
public record SpecialtyUpdateRequest(
    @NotBlank(message = "NAME_REQUIRED")
    @Size(max = 200, message = "NAME_TOO_LONG") String name,
    @Size(max = 36, message = "ID_TOO_LONG") String categoryId) {}
