package com.mems.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Khai báo endpoint mà quyền duyệt được quyết định trong service/policy
 * (không có {@code @RequirePermission}/{@code @PreAuthorize} để interceptor đọc).
 *
 * <p>Nhờ vậy audit DEL-01 biết chính xác quyền nào đã được dùng, trên tài
 * nguyên nào, thay vì suy đoán từ sự tồn tại của ủy quyền.</p>
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface DelegatedAction {
    /** Mã quyền mà handler dựa vào để cho phép thao tác. */
    String permission();

    /** Loại tài nguyên bị tác động (vd RESIGNATION_REQUEST). */
    String resourceType();

    /** Tên path variable chứa id tài nguyên; rỗng nếu không có. */
    String resourceId() default "";
}
