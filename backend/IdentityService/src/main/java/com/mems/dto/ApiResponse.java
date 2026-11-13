package com.mems.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {
    private boolean success;
    private String code;
    private String message;
    private T data;

    public static <T> ApiResponse<T> success(String mess, T data) {
        return new ApiResponse<>(true, null, mess, data);
    }

    public static <T> ApiResponse<T> failure(String code, String mess) {
        return new ApiResponse<>(false, code, mess, null);
    }
}
