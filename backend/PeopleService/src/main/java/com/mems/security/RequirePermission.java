package com.mems.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Kiểm tra mã quyền + phạm vi + org_id (lấy từ JWT) trước khi vào controller.
 * {@code department} là tên path variable chứa departmentId; để trống nghĩa là
 * quyền cấp tổ chức (không kiểm tra phòng ban).
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RequirePermission {
    String value();
    String department() default "";
}
