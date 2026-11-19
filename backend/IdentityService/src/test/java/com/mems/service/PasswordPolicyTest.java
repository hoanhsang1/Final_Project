package com.mems.service;

import com.mems.exception.AppException;
import com.mems.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PasswordPolicyTest {

    @Test
    @DisplayName("AUTH-09: tối thiểu 12 ký tự và tối đa 72 byte UTF-8 cho mọi luồng")
    void enforcesLengthAndByteLimit() {
        assertThatCode(() -> PasswordPolicy.validate("ChosenPass123")).doesNotThrowAnyException();

        assertThatThrownBy(() -> PasswordPolicy.validate("short"))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.PASSWORD_TOO_SHORT));

        assertThatThrownBy(() -> PasswordPolicy.validate("mậtkhẩu".repeat(10)))
            .isInstanceOf(AppException.class)
            .satisfies(ex -> assertThat(((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.PASSWORD_TOO_LONG));
    }
}
