package com.mems.service;

import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;

import java.nio.charset.StandardCharsets;

/**
 * AUTH-09: một chính sách mật khẩu duy nhất cho đăng ký, đổi và đặt lại.
 * BCrypt chỉ dùng 72 byte đầu nên giới hạn theo UTF-8 bytes.
 */
public final class PasswordPolicy {
    public static final int MIN_LENGTH = 12;
    public static final int MAX_BYTES = 72;

    private PasswordPolicy() {}

    public static void validate(String password) {
        if (password == null || password.length() < MIN_LENGTH) {
            throw new AppException(ErrorCode.PASSWORD_TOO_SHORT);
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            throw new AppException(ErrorCode.PASSWORD_TOO_LONG);
        }
    }
}
