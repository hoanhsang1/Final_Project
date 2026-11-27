package com.mems.dto;

public record SpecialtyResponse(String id, String name, String categoryId) {

    /** Giữ tương thích cho các chỗ chỉ cần id/name. */
    public SpecialtyResponse(String id, String name) {
        this(id, name, null);
    }
}
