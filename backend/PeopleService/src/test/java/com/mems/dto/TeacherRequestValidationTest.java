package com.mems.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class TeacherRequestValidationTest {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    @DisplayName("AC-15.01 Request hợp lệ không có lỗi validate")
    void validRequestHasNoViolations() {
        assertThat(validator.validate(validCreate())).isEmpty();
    }

    @Test
    @DisplayName("AC-15.02 Thiếu trường bắt buộc: lỗi tại đúng từng trường")
    void reportsEachRequiredField() {
        TeacherCreateRequest request = new TeacherCreateRequest(
            " ", "", "", "TEACHER", Set.of(), " ", "", "", null);

        Set<String> fields = properties(validator.validate(request));

        assertThat(fields).contains("departmentId", "username", "email", "role",
            "positionIds", "staffCode", "fullName", "phone", "teacherProfile");
    }

    @Test
    @DisplayName("AC-15.05 Email và SĐT sai định dạng bị chặn tại trường")
    void rejectsMalformedEmailAndPhone() {
        TeacherCreateRequest request = new TeacherCreateRequest(
            "dept-1", "giao.vien", "khong-phai-email", "STAFF", Set.of("pos-1"),
            "GV001", "Nguyễn Văn An", "abc", teacherProfile(Set.of("sp-1")));

        Set<String> fields = properties(validator.validate(request));

        assertThat(fields).contains("email", "phone");
    }

    @Test
    @DisplayName("AC-15.06/15.08 Chuyên môn: bắt buộc ít nhất một, mỗi phần tử không rỗng")
    void requiresAtLeastOneSpecialty() {
        TeacherCreateRequest empty = new TeacherCreateRequest(
            "dept-1", "gv001", "an@example.com", "STAFF", Set.of("pos-1"),
            "GV001", "Nguyễn Văn An", "0900000000", teacherProfile(Set.of()));
        TeacherCreateRequest blank = new TeacherCreateRequest(
            "dept-1", "gv001", "an@example.com", "STAFF", Set.of("pos-1"),
            "GV001", "Nguyễn Văn An", "0900000000", teacherProfile(Set.of(" ")));

        assertThat(properties(validator.validate(empty))).contains("teacherProfile.specialtyIds");
        assertThat(validator.validate(blank)).isNotEmpty();
    }

    @Test
    @DisplayName("AC-15.07/15.12 Loại hợp đồng để trống vẫn hợp lệ, chỉ nhận giá trị cho phép")
    void contractTypeIsOptionalWithFixedValues() {
        TeacherUpdateRequest noContract = new TeacherUpdateRequest(
            "Nguyễn Văn An", "an@example.com", "", Set.of("sp-1"), null, 0L, null);
        TeacherUpdateRequest badContract = new TeacherUpdateRequest(
            "Nguyễn Văn An", "an@example.com", "", Set.of("sp-1"), "KHONG_HOP_LE", 0L, null);

        assertThat(validator.validate(noContract)).isEmpty();
        assertThat(properties(validator.validate(badContract))).contains("contractType");
    }

    @Test
    @DisplayName("AC-15.09 Họ tên quá dài bị chặn, khoảng trắng được xử lý ở service")
    void rejectsOverlongFullName() {
        TeacherUpdateRequest request = new TeacherUpdateRequest(
            "a".repeat(201), "an@example.com", "", Set.of("sp-1"), null, 0L, null);

        assertThat(properties(validator.validate(request))).contains("fullName");
    }

    private TeacherCreateRequest validCreate() {
        return new TeacherCreateRequest("dept-1", "gv001", "an@example.com", "STAFF",
            Set.of("pos-1"), "GV001", "Nguyễn Văn An", "0900000000",
            teacherProfile(Set.of("sp-1")));
    }

    private TeacherProfileRequest teacherProfile(Set<String> specialtyIds) {
        return new TeacherProfileRequest(specialtyIds, "CO_HUU");
    }

    private Set<String> properties(Set<? extends ConstraintViolation<?>> violations) {
        return violations.stream()
            .map(v -> v.getPropertyPath().toString())
            .collect(java.util.stream.Collectors.toSet());
    }
}
